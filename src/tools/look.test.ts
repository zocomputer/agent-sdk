import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "eve/tools";
import { createStdlib } from "../index";
import { TEXT_ONLY_CAPABILITIES } from "../model-capabilities";
import { createWorkspace } from "../workspace";
import { localIoProvider } from "../workspace-io";
import {
  boundAnswer,
  createLookTool,
  DEFAULT_LOOK_TIMEOUT_MS,
  DEFAULT_MEDIA_ORACLE,
  LOOK_MAX_ANSWER_CHARS,
  lookAvKindClause,
  lookFetchedImageHint,
  lookFetchedMediaHint,
  lookOversizeHint,
  lookReadImageHint,
  lookReadMediaHint,
  resolveMediaOracle,
  type LookGenerateFn,
  type LookOracleConfig,
} from "./look";

const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-look-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));

// A 1x1 PNG, a minimal %PDF- header, a minimal ISO BMFF ftyp box (mp4), and
// a plain text file.
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
writeFileSync(join(root, "pic.png"), PNG_BYTES);
writeFileSync(join(root, "doc.pdf"), Buffer.from("%PDF-1.4 fake"));
writeFileSync(
  join(root, "clip.mp4"),
  Buffer.concat([
    Buffer.from([0, 0, 0, 20]),
    Buffer.from("ftypisom"),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from("isom"),
  ]),
);
writeFileSync(join(root, "notes.txt"), "plain text\n");

const workspace = createWorkspace(root);

const ctx: ToolContext = {
  session: {
    id: "look-session",
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

interface CapturedCall {
  model: unknown;
  messages: unknown[];
  headers: Record<string, string> | undefined;
  timeoutMs: number;
}

function fakeGenerate(answer: string): { calls: CapturedCall[]; fn: LookGenerateFn } {
  const calls: CapturedCall[] = [];
  const fn: LookGenerateFn = async (options) => {
    calls.push({
      model: options.model,
      messages: options.messages,
      headers: options.headers,
      timeoutMs: options.timeoutMs,
    });
    return { text: answer };
  };
  return { calls, fn };
}

const FULL_ORACLE: LookOracleConfig = {
  model: "google/gemini-3-flash",
  modelName: "Gemini 3 Flash",
  capabilities: { image: true, pdf: true, video: true, audio: true },
  headers: { "x-zo-tool": "look" },
};

describe("createLookTool", () => {
  test("sends one user message (prompt + file part) and returns the bounded answer", async () => {
    const { calls, fn } = fakeGenerate("A tiny black pixel.");
    const look = createLookTool({
      workspace,
      noun: "repo",
      oracle: FULL_ORACLE,
      generateFn: fn,
    });
    const result = await look.execute(
      { path: "pic.png", prompt: "What is in this image?" },
      ctx,
    );
    expect(result).toEqual({
      path: "pic.png",
      media_type: "image/png",
      model: "Gemini 3 Flash",
      answer: "A tiny black pixel.",
    });
    expect(calls).toHaveLength(1);
    const call = calls[0];
    if (call === undefined) throw new Error("expected one call");
    expect(call.model).toBe("google/gemini-3-flash");
    expect(call.headers).toEqual({ "x-zo-tool": "look" });
    // The stream-guard substitute: every generate call carries a total
    // timeout so a dead gateway connection errors instead of hanging.
    expect(call.timeoutMs).toBe(DEFAULT_LOOK_TIMEOUT_MS);
    expect(call.messages).toHaveLength(1);
    const message = call.messages[0];
    expect(message).toEqual({
      role: "user",
      content: [
        { type: "text", text: "What is in this image?" },
        {
          type: "file",
          data: PNG_BYTES,
          mediaType: "image/png",
          filename: "pic.png",
        },
      ],
    });
  });

  test("routes PDFs and video to their media types", async () => {
    const { calls, fn } = fakeGenerate("ok");
    const look = createLookTool({ workspace, oracle: FULL_ORACLE, generateFn: fn });
    const pdf = await look.execute({ path: "doc.pdf", prompt: "Summarize." }, ctx);
    expect(pdf).toMatchObject({ media_type: "application/pdf" });
    const video = await look.execute({ path: "clip.mp4", prompt: "Describe." }, ctx);
    expect(video).toMatchObject({ media_type: "video/mp4" });
    expect(calls).toHaveLength(2);
  });

  test("omits headers when the oracle has none", async () => {
    const { calls, fn } = fakeGenerate("ok");
    const { headers: _omitted, ...headerless } = FULL_ORACLE;
    const look = createLookTool({
      workspace,
      oracle: headerless,
      generateFn: fn,
    });
    await look.execute({ path: "pic.png", prompt: "Look." }, ctx);
    expect(calls[0]?.headers).toBeUndefined();
  });

  test("an oracle timeoutMs overrides the default", async () => {
    const { calls, fn } = fakeGenerate("ok");
    const look = createLookTool({
      workspace,
      oracle: { ...FULL_ORACLE, timeoutMs: 30_000 },
      generateFn: fn,
    });
    await look.execute({ path: "pic.png", prompt: "Look." }, ctx);
    expect(calls[0]?.timeoutMs).toBe(30_000);
  });

  test("refuses a kind outside the oracle's capability set, naming it", async () => {
    const { calls, fn } = fakeGenerate("never");
    const look = createLookTool({
      workspace,
      oracle: {
        model: "anthropic/claude-opus-4.8",
        modelName: "Claude Opus 4.8",
        capabilities: { image: true, pdf: true, video: false, audio: false },
      },
      generateFn: fn,
    });
    await expect(
      look.execute({ path: "clip.mp4", prompt: "Describe." }, ctx),
    ).rejects.toThrow("Claude Opus 4.8 cannot view");
    await expect(
      look.execute({ path: "clip.mp4", prompt: "Describe." }, ctx),
    ).rejects.toThrow("can view images and PDFs, but not video or audio");
    expect(calls).toHaveLength(0);
  });

  test("refuses text-readable files toward read", async () => {
    const { fn } = fakeGenerate("never");
    const look = createLookTool({ workspace, oracle: FULL_ORACLE, generateFn: fn });
    await expect(
      look.execute({ path: "notes.txt", prompt: "Read this." }, ctx),
    ).rejects.toThrow("read it yourself with the read tool");
  });

  test("missing files and oversized files error before any model call", async () => {
    const { calls, fn } = fakeGenerate("never");
    const look = createLookTool({
      workspace,
      oracle: FULL_ORACLE,
      generateFn: fn,
      maxInputBytes: 4,
    });
    await expect(look.execute({ path: "nope.png", prompt: "?" }, ctx)).rejects.toThrow(
      "does not exist",
    );
    await expect(look.execute({ path: "pic.png", prompt: "?" }, ctx)).rejects.toThrow(
      "too large to send to Gemini 3 Flash",
    );
    expect(calls).toHaveLength(0);
  });

  test("the cap holds on the bytes actually read, not just the stat", async () => {
    // A file growing between stat and read (an in-progress download) must
    // still refuse: the cap governs what we send, and stat.size can lie.
    const { calls, fn } = fakeGenerate("never");
    const io = localIoProvider(workspace.root);
    const lyingIo: typeof io = () => {
      const real = io(undefined);
      return {
        ...real,
        stat: async (abs) => {
          const stat = await real.stat(abs);
          return stat === null ? null : { ...stat, size: 1 };
        },
      };
    };
    const look = createLookTool({
      workspace,
      oracle: FULL_ORACLE,
      generateFn: fn,
      io: lyingIo,
      maxInputBytes: 4,
    });
    await expect(look.execute({ path: "pic.png", prompt: "?" }, ctx)).rejects.toThrow(
      "too large to send to Gemini 3 Flash",
    );
    expect(calls).toHaveLength(0);
  });

  test("bounds an oversized answer with a truncation marker", async () => {
    const { fn } = fakeGenerate("x".repeat(LOOK_MAX_ANSWER_CHARS + 100));
    const look = createLookTool({ workspace, oracle: FULL_ORACLE, generateFn: fn });
    const result = await look.execute({ path: "pic.png", prompt: "Go long." }, ctx);
    expect(result.answer.length).toBeLessThan(LOOK_MAX_ANSWER_CHARS + 200);
    expect(result.answer).toContain("[answer truncated");
  });

  test("an empty or non-string answer normalizes to an honest note", async () => {
    // The generate seam is a boundary: a provider can finish with no text
    // output, and the tool must return an honest note instead of crashing
    // (or handing the model a confusing empty string).
    const { fn } = fakeGenerate("");
    const look = createLookTool({ workspace, oracle: FULL_ORACLE, generateFn: fn });
    const result = await look.execute({ path: "pic.png", prompt: "?" }, ctx);
    expect(result.answer).toBe("(the model returned no answer text)");
    expect(boundAnswer(undefined)).toBe("(the model returned no answer text)");
    expect(boundAnswer(42)).toBe("(the model returned no answer text)");
    expect(boundAnswer("fine")).toBe("fine");
  });

  test("truncation never cuts through a surrogate pair", () => {
    // An emoji straddling the cap boundary: the cut must back off one unit
    // instead of leaving a lone high surrogate (which breaks JSON encoding
    // to the model API).
    const straddling = "x".repeat(LOOK_MAX_ANSWER_CHARS - 1) + "😀" + "y".repeat(50);
    const bounded = boundAnswer(straddling);
    const marker = bounded.indexOf("\n…");
    const kept = bounded.slice(0, marker);
    expect(kept.length).toBe(LOOK_MAX_ANSWER_CHARS - 1);
    const last = kept.charCodeAt(kept.length - 1);
    expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
  });

  test("the description carries the oracle's identity and capability phrase", () => {
    const look = createLookTool({ workspace, noun: "repo", oracle: FULL_ORACLE });
    expect(look.description).toContain("Gemini 3 Flash");
    expect(look.description).toContain("can view images, PDFs, video, and audio");
    expect(look.description).toContain("repo");
  });
});

describe("the ai import stays lazy", () => {
  // eve bundles each authored tool module into exactly ONE rolldown chunk; a
  // static value-import of `ai` pulls its CJS deps (@vercel/oidc) into the
  // graph and splits the bundle, failing every consumer that doesn't
  // externalize `ai` (measured on the Builder's Vercel deploy). Pin that the
  // module's only static `ai` import is type-only, and that the runtime
  // specifier still resolves to a generateText.
  test("look.ts has no static value-import of ai", async () => {
    const source = await Bun.file(new URL("./look.ts", import.meta.url)).text();
    const staticAiImports = source
      .split("\n")
      .filter((line) => /^import .*from "ai";/.test(line));
    expect(staticAiImports).toEqual(['import type { LanguageModel, ModelMessage } from "ai";']);
  });

  test("the runtime ai module resolves with generateText", async () => {
    const mod = (await import("ai")) as { generateText?: unknown };
    expect(typeof mod.generateText).toBe("function");
  });
});

describe("resolveMediaOracle", () => {
  test("true selects the default oracle; a config passes through", () => {
    expect(resolveMediaOracle(true)).toBe(DEFAULT_MEDIA_ORACLE);
    expect(resolveMediaOracle(FULL_ORACLE)).toBe(FULL_ORACLE);
  });

  test("the default oracle covers every media kind (the superset requirement)", () => {
    expect(DEFAULT_MEDIA_ORACLE.capabilities).toEqual({
      image: true,
      pdf: true,
      video: true,
      audio: true,
    });
  });
});

describe("look hints", () => {
  test("route to look only for kinds the oracle actually views", () => {
    expect(lookReadImageHint(DEFAULT_MEDIA_ORACLE)).toContain("look tool");
    expect(lookReadMediaHint(DEFAULT_MEDIA_ORACLE)).toContain("Gemini 3 Flash");
    expect(lookFetchedImageHint(DEFAULT_MEDIA_ORACLE)).toContain("Download");
    // Fetched video/audio route the same way as fetched images —
    // download-then-look — while keeping the bash/ffmpeg extraction fallback
    // the default hint offers.
    expect(lookFetchedMediaHint(DEFAULT_MEDIA_ORACLE)).toContain("download it");
    expect(lookFetchedMediaHint(DEFAULT_MEDIA_ORACLE)).toContain("look tool");
    expect(lookFetchedMediaHint(DEFAULT_MEDIA_ORACLE)).toContain("ffmpeg");
    const blind: LookOracleConfig = {
      model: "m",
      modelName: "M",
      capabilities: TEXT_ONLY_CAPABILITIES,
    };
    expect(lookReadImageHint(blind)).toBeUndefined();
    expect(lookReadMediaHint(blind)).toBeUndefined();
    expect(lookFetchedImageHint(blind)).toBeUndefined();
    expect(lookFetchedMediaHint(blind)).toBeUndefined();
    expect(lookOversizeHint(blind)).toBeUndefined();
  });

  test("the AV hint scopes its look clause to the exact kinds the oracle takes", () => {
    // read/webfetch share ONE mediaUnavailableHint across video and audio
    // results, so a one-kind oracle's hint must name only its kind — an
    // unconditional "pass it to look" would steer the other kind into look's
    // refusal.
    expect(lookAvKindClause(DEFAULT_MEDIA_ORACLE.capabilities)).toBe(
      "a video or audio file",
    );
    const videoOnly: LookOracleConfig = {
      model: "m",
      modelName: "M",
      capabilities: { image: true, pdf: true, video: true, audio: false },
    };
    expect(lookReadMediaHint(videoOnly)).toContain("If it is a video file");
    expect(lookReadMediaHint(videoOnly)).not.toContain("audio");
    const audioOnly: LookOracleConfig = {
      model: "m",
      modelName: "M",
      capabilities: { image: true, pdf: true, video: false, audio: true },
    };
    expect(lookFetchedMediaHint(audioOnly)).toContain("If it is an audio file");
    expect(lookFetchedMediaHint(audioOnly)).not.toContain("video file");
  });

  test("the oversize hint names look AND its cap for the read-cap..look-cap band", () => {
    // read rejects files over its byte cap before kind detection, but look
    // sends up to 20 MiB — the oversize error is the only surface that can
    // route that band. It must name look's cap (a file over it would bounce
    // between two refusals) and the EXACT kinds look takes (the error fires
    // before kind detection, so a bare "media file" would misroute a large
    // text file into look's refusal).
    const hint = lookOversizeHint(DEFAULT_MEDIA_ORACLE);
    expect(hint).toContain("look tool");
    expect(hint).toContain("Gemini 3 Flash");
    expect(hint).toContain("up to 20 MB");
    expect(hint).toContain("shrink it first");
    expect(hint).toContain("Only if it is an image, PDF, video, or audio file");
    // The text route leads: that's what most oversize reads are.
    expect(hint?.startsWith("For text, use bash")).toBe(true);
    // A custom cap interpolates.
    expect(lookOversizeHint(DEFAULT_MEDIA_ORACLE, 5 * 1024 * 1024)).toContain("up to 5 MB");
    // A narrower oracle names only its kinds, with the right article.
    const pdfOnly = lookOversizeHint({
      model: "m",
      modelName: "M",
      capabilities: { image: false, pdf: true, video: false, audio: false },
    });
    expect(pdfOnly).toContain("Only if it is a PDF file");
  });
});

describe("stdlib wiring", () => {
  test("mediaOracle: true adds tools.look and instructions.media", () => {
    const stdlib = createStdlib({
      workspaceRoot: root,
      stateDir: join(root, ".state"),
      mediaOracle: true,
    });
    expect(stdlib.tools.look).toBeDefined();
    expect(stdlib.instructions.media).toBeDefined();
    // The RESOLVED oracle is exposed so task children derive their hints and
    // media instruction from the exact config the parent's look runs (their
    // look is a re-export of the parent's instance).
    expect(stdlib.mediaOracle).toBe(DEFAULT_MEDIA_ORACLE);
  });

  test("a custom oracle config is exposed as-is", () => {
    const stdlib = createStdlib({
      workspaceRoot: root,
      stateDir: join(root, ".state"),
      mediaOracle: FULL_ORACLE,
    });
    expect(stdlib.mediaOracle).toBe(FULL_ORACLE);
  });

  test("no mediaOracle → no look tool, no media instruction", () => {
    const stdlib = createStdlib({
      workspaceRoot: root,
      stateDir: join(root, ".state"),
    });
    expect(stdlib.tools.look).toBeUndefined();
    expect(stdlib.instructions.media).toBeUndefined();
    expect(stdlib.mediaOracle).toBeNull();
  });

  test("a text-only parent's read note routes to look", async () => {
    const stdlib = createStdlib({
      workspaceRoot: root,
      stateDir: join(root, ".state"),
      parentCapabilities: TEXT_ONLY_CAPABILITIES,
      mediaOracle: true,
    });
    const result = await stdlib.tools.read.execute({ path: "pic.png" }, ctx);
    if (!("note" in result) || typeof result.note !== "string") {
      throw new Error("expected a metadata-only note");
    }
    expect(result.note).toContain("text/json only");
    expect(result.note).toContain("look tool");
    expect(result.note).not.toContain("ask the user");
  });

  test("an oversized read's error routes to look when the oracle is wired", async () => {
    // Over read's byte cap (before kind detection) but within look's 20 MiB.
    writeFileSync(join(root, "big.mp4"), Buffer.alloc(11 * 1024 * 1024));
    const stdlib = createStdlib({
      workspaceRoot: root,
      stateDir: join(root, ".state"),
      mediaOracle: true,
    });
    await expect(stdlib.tools.read.execute({ path: "big.mp4" }, ctx)).rejects.toThrow(
      /look tool/,
    );
  });

});
