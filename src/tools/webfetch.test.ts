import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "eve/tools";
import { readImageChatAttachment } from "../attachments";
import { HEAD_CHARS, TAIL_CHARS } from "../bounded-output";
import type { FetchLike } from "../web-fetch";
import { createWorkspace } from "../workspace";
import { createWebFetchTool } from "./webfetch";

const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-webfetch-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const workspace = createWorkspace(root);
const spillDir = join(root, ".agent", "tool-outputs");

const ctx: ToolContext = {
  session: {
    id: "test-session",
    auth: { current: null, initiator: null },
    turn: { id: "turn-1", sequence: 1 },
  },
  getSandbox: () => Promise.reject(new Error("no sandbox in tests")),
  getSkill: () => {
    throw new Error("no skills in tests");
  },
  getToken: () => Promise.reject(new Error("no auth in tests")),
  requireAuth: () => {
    throw new Error("no auth in tests");
  },
};

function toolWith(response: Response | ((url: string) => Response)) {
  const fetchImpl: FetchLike = (input) =>
    Promise.resolve(typeof response === "function" ? response(input) : response);
  return createWebFetchTool({
    workspace,
    spillDir,
    attachImagesToChat: true,
    maxInlineImageBytes: 5 * 1024 * 1024,
    fetchImpl,
  });
}

const fixture = (name: string) =>
  new URL(`../extract/fixtures/${name}`, import.meta.url).pathname;

describe("webfetch tool", () => {
  test("converts an html page to markdown by default", async () => {
    const tool = toolWith(
      new Response("<html><body><h1>Title</h1><p>Body text.</p></body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
    const result = await tool.execute({ url: "https://example.com/docs" }, ctx);
    expect(result).toMatchObject({
      url: "https://example.com/docs",
      contentType: "text/html; charset=utf-8",
      format: "markdown",
      truncated: false,
    });
    if (!("content" in result)) throw new Error("expected text content");
    expect(result.content).toContain("# Title");
    expect(result.content).toContain("Body text.");
    // No redirect happened, so no finalUrl on the result.
    expect("finalUrl" in result).toBe(false);
  });

  test("returns raw html when asked and passes non-html text through", async () => {
    const html = toolWith(
      new Response("<h1>Raw</h1>", { status: 200, headers: { "content-type": "text/html" } }),
    );
    const raw = await html.execute({ url: "https://example.com", format: "html" }, ctx);
    if (!("content" in raw)) throw new Error("expected content");
    expect(raw.content).toBe("<h1>Raw</h1>");

    const json = toolWith(
      new Response('{"answer":42}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const passthrough = await json.execute({ url: "https://api.example.com/x" }, ctx);
    if (!("content" in passthrough)) throw new Error("expected content");
    expect(passthrough.content).toBe('{"answer":42}');
  });

  test("names the redirected final URL when it differs", async () => {
    const response = new Response("<p>hi</p>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
    Object.defineProperty(response, "url", { value: "https://cdn.example.com/moved" });
    const tool = toolWith(response);
    const result = await tool.execute({ url: "https://example.com/old" }, ctx);
    expect(result).toMatchObject({
      url: "https://example.com/old",
      finalUrl: "https://cdn.example.com/moved",
    });
  });

  test("spills oversized pages and keeps head + tail in context", async () => {
    const body = `start-marker\n${"middle line\n".repeat(30_000)}end-marker\n`;
    const tool = toolWith(
      new Response(body, { status: 200, headers: { "content-type": "text/plain" } }),
    );
    const result = await tool.execute({ url: "https://example.com/huge.txt" }, ctx);
    if (!("content" in result) || !("truncated" in result)) throw new Error("expected content");
    expect(result.truncated).toBe(true);
    expect(result.totalChars).toBe(body.length);
    expect(result.content).toContain("start-marker");
    expect(result.content).toContain("end-marker");
    expect(result.content.length).toBeLessThan(HEAD_CHARS + TAIL_CHARS + 500);
    // The truncation marker names a spill file holding the complete output.
    const match = result.content.match(/full output: (\S+)]/);
    if (!match?.[1]) throw new Error(`expected a spill label in: ${result.content.slice(24_900, 25_200)}`);
    const spillPath = join(root, match[1]);
    expect(existsSync(spillPath)).toBe(true);
    expect(readFileSync(spillPath, "utf8")).toBe(body);
  });

  test("extracts a fetched PDF to text with a page count", async () => {
    const pdf = readFileSync(fixture("two-page.pdf"));
    const tool = toolWith(
      new Response(pdf, { status: 200, headers: { "content-type": "application/pdf" } }),
    );
    const result = await tool.execute({ url: "https://example.com/doc.pdf" }, ctx);
    expect(result).toMatchObject({ source: "pdf", pages: 2 });
    if (!("content" in result)) throw new Error("expected extracted text");
    expect(result.content).toContain("=== page 1 of 2 ===");
  });

  test("attaches a fetched image for the chat and strips it from model output", async () => {
    const png = readFileSync(fixture("tiny.png"));
    const tool = toolWith(
      new Response(png, { status: 200, headers: { "content-type": "image/png" } }),
    );
    const result = await tool.execute({ url: "https://example.com/pic.png" }, ctx);
    expect(result).toMatchObject({ source: "image", imageFormat: "png" });

    const attachment = readImageChatAttachment(result);
    if (!attachment) throw new Error("expected a chat attachment");
    expect(attachment.mediaType).toBe("image/png");
    expect(attachment.filename).toBe("pic.png");
    expect(attachment.dataUrl.startsWith("data:image/png;base64,")).toBe(true);

    const model = await tool.toModelOutput?.(result);
    if (!model || model.type !== "json") throw new Error("expected json model output");
    expect(readImageChatAttachment(model.value)).toBeNull();
  });

  test("falls back to a note when image inlining is off", async () => {
    const png = readFileSync(fixture("tiny.png"));
    const tool = createWebFetchTool({
      workspace,
      spillDir,
      attachImagesToChat: false,
      maxInlineImageBytes: 5 * 1024 * 1024,
      fetchImpl: () =>
        Promise.resolve(
          new Response(png, { status: 200, headers: { "content-type": "image/png" } }),
        ),
    });
    const result = await tool.execute({ url: "https://example.com/pic.png" }, ctx);
    expect(readImageChatAttachment(result)).toBeNull();
    if (!("note" in result) || typeof result.note !== "string") throw new Error("expected a note");
    expect(result.note).toContain("ask the user");
  });

  test("refuses opaque binary content with a download hint", async () => {
    // PK\x03\x04 — a zip, which has no text rendering.
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    const tool = toolWith(
      new Response(zip, { status: 200, headers: { "content-type": "application/zip" } }),
    );
    await expect(tool.execute({ url: "https://example.com/x.zip" }, ctx)).rejects.toThrow(
      /text and images only/,
    );
  });

  test("extracts DOCX from extensionless URLs using Content-Type", async () => {
    // Real-world scenario: a URL like /document?id=123 with no extension, but
    // Content-Type tells us it's a DOCX. The ZIP container must be disambiguated
    // by extension, so we synthesize one from the header.
    const docx = readFileSync(fixture("sample.docx"));
    const tool = toolWith(
      new Response(docx, {
        status: 200,
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      }),
    );
    const result = await tool.execute({ url: "https://example.com/document?id=123" }, ctx);
    expect(result).toMatchObject({ source: "docx" });
    if (!("content" in result)) throw new Error("expected extracted text");
    expect(result.content.length).toBeGreaterThan(0);
  });
});

  test("upgrades legacy MIME extensions for ZIP containers", async () => {
    // Server sends XLSX with legacy application/vnd.ms-excel MIME type
    const xlsx = readFileSync(fixture("two-sheet.xlsx"));
    const tool = toolWith(
      new Response(xlsx, {
        status: 200,
        headers: { "content-type": "application/vnd.ms-excel" },
      }),
    );
    // Should recognize it as modern XLSX (ZIP container), not legacy XLS
    const result = await tool.execute({ url: "https://example.com/report" }, ctx);
    expect(result).toMatchObject({ source: "sheet", sheetFormat: "xlsx" });
    if (!("content" in result)) throw new Error("expected extracted text");
    expect(result.content.length).toBeGreaterThan(0);
  });
