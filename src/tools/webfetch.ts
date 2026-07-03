import { defineTool } from "eve/tools";
import { z } from "zod";
import { basename, join } from "node:path";
import { CHAT_ATTACHMENT_FIELD, type ImageChatAttachment } from "../attachments";
import { createBoundedCapture } from "../bounded-output";
import { detectFileKind, imageMediaType } from "../file-kind";
import { loadFileContent } from "../read-file-content";
import {
  fetchWebResource,
  renderWebText,
  resolveWebFetchTimeoutMs,
  WEB_FETCH_DEFAULT_TIMEOUT_SECONDS,
  WEB_FETCH_MAX_TIMEOUT_SECONDS,
  WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS,
  type FetchLike,
  type WebFetchFormat,
} from "../web-fetch";
import type { Workspace } from "../workspace";

// Web fetch under the opencode name `webfetch`, built to beat both eve's
// framework `web_fetch` and opencode's tool by reusing the stdlib's own
// machinery: bounded output spills the complete page to the tool-outputs dir
// (eve's web_fetch discards everything past its cap), fetched PDFs/DOCX/
// spreadsheets route through the same extractors as `read`, and images ride
// the chat-attachment contract instead of decoding to garbage. The fetch/
// render core lives in ../web-fetch.ts; this wrapper owns routing + bounding.

const SPILL_EXTENSION: Record<WebFetchFormat, string> = {
  markdown: "md",
  text: "txt",
  html: "html",
};

function spillFilename(format: WebFetchFormat, kind: "text" | "extracted"): string {
  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = kind === "extracted" ? "txt" : SPILL_EXTENSION[format];
  return `webfetch-${runId}.${ext}`;
}

function imageFilename(finalUrl: string): string {
  try {
    const name = basename(new URL(finalUrl).pathname);
    return name === "" || name === "/" ? "image" : name;
  } catch {
    return "image";
  }
}

// ZIP magic bytes (PK\x03\x04)
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

function startsWithBytes(buf: Buffer, magic: number[]): boolean {
  if (buf.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (buf[i] !== magic[i]) return false;
  }
  return true;
}

// Map Content-Type to file extension for Office/document formats that need it
// for ZIP/CFB container disambiguation when the URL path has no extension.
const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/msword": ".doc",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.oasis.opendocument.text": ".odt",
  "application/vnd.oasis.opendocument.spreadsheet": ".ods",
  "application/vnd.oasis.opendocument.presentation": ".odp",
  "application/pdf": ".pdf",
};

// Legacy MIME types that servers sometimes use for modern OpenXML files
const LEGACY_TO_MODERN_EXT: Record<string, string> = {
  ".doc": ".docx",
  ".xls": ".xlsx",
  ".ppt": ".pptx",
};

/**
 * Build a path-like label for file-kind detection and extraction caching.
 * Uses the URL pathname when it has an extension, but upgrades legacy Office
 * extensions (.xls, .doc) to modern OpenXML (.xlsx, .docx) when ZIP magic
 * bytes are detected. For extensionless URLs, synthesizes an extension from
 * Content-Type, again preferring modern formats when ZIP bytes are present.
 */
function pathLabelForFetch(finalUrl: string, contentType: string, body: Buffer): string {
  const pathname = new URL(finalUrl).pathname;
  const extMatch = pathname.match(/(\.[a-z0-9]+)$/i);

  if (extMatch) {
    // Pathname has an extension; upgrade legacy to modern if ZIP magic present
    const captured = extMatch[1];
    if (!captured) return pathname;
    const currentExt = captured.toLowerCase();
    if (startsWithBytes(body, ZIP_MAGIC)) {
      const modernExt = LEGACY_TO_MODERN_EXT[currentExt];
      if (modernExt) {
        return pathname.slice(0, -currentExt.length) + modernExt;
      }
    }
    return pathname;
  }

  // No extension in pathname; synthesize from Content-Type
  const mime = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  let ext = CONTENT_TYPE_EXTENSIONS[mime];
  if (!ext) return pathname;
  // Upgrade legacy MIME-derived extensions if ZIP magic present
  if (startsWithBytes(body, ZIP_MAGIC)) {
    ext = LEGACY_TO_MODERN_EXT[ext] ?? ext;
  }
  return pathname + ext;
}

export function createWebFetchTool(opts: {
  workspace: Workspace;
  spillDir: string;
  attachImagesToChat: boolean;
  maxInlineImageBytes: number;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: FetchLike;
}) {
  const { workspace, spillDir, attachImagesToChat, maxInlineImageBytes, fetchImpl } = opts;

  const bounded = (text: string, format: WebFetchFormat, kind: "text" | "extracted") => {
    const spillPath = join(spillDir, spillFilename(format, kind));
    const capture = createBoundedCapture({
      spillPath,
      spillLabel: workspace.relativize(spillPath),
    });
    capture.append(text);
    const snapshot = capture.snapshot();
    return {
      content: snapshot.text,
      totalChars: snapshot.totalChars,
      truncated: snapshot.truncated,
    };
  };

  return defineTool({
    description:
      `Fetch a URL and return its content. HTML pages are reduced to their main content (boilerplate stripped, title/author/date header) and converted to readable markdown by default (set format to "text" for plain text or "html" for the raw page). Fetched PDF, DOCX, and spreadsheet files are converted to plain text; fetching an image queues it to appear as a viewable attachment on your next message. Content over the in-context budget is truncated head+tail and the complete output is spilled to a file named in the truncation marker — read or grep that file instead of re-fetching. Default timeout ${WEB_FETCH_DEFAULT_TIMEOUT_SECONDS}s (${WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS}s for PDFs), max ${WEB_FETCH_MAX_TIMEOUT_SECONDS}s; responses over 5 MB error. Read-only: one HTTP GET, no side effects.`,
    inputSchema: z.object({
      url: z
        .string()
        .min(1)
        .describe("The URL to fetch. Must start with http:// or https://."),
      format: z
        .enum(["markdown", "text", "html"])
        .optional()
        .describe(
          'How to render HTML responses: "markdown" (default), "text", or "html" (raw). Non-HTML content is unaffected.',
        ),
      timeout: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          `Timeout in seconds (default ${WEB_FETCH_DEFAULT_TIMEOUT_SECONDS}, max ${WEB_FETCH_MAX_TIMEOUT_SECONDS}).`,
        ),
    }),
    async execute({ url, format, timeout }) {
      const renderFormat: WebFetchFormat = format ?? "markdown";
      const fetched = await fetchWebResource({
        url,
        format: renderFormat,
        timeoutMs: resolveWebFetchTimeoutMs(timeout, url),
        // Without an explicit timeout, let the deadline extend to the PDF
        // default when the response (not the request URL) turns out to be a
        // PDF — a redirect to `.pdf` or an extensionless PDF URL.
        ...(timeout === undefined
          ? { pdfTimeoutMs: WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS * 1000 }
          : {}),
        fetchImpl,
      });
      const { body, contentType, finalUrl } = fetched;
      // Surface cross-URL redirects so the model knows where the content
      // actually came from; same-URL responses stay quiet.
      const redirect = finalUrl !== url ? { finalUrl } : {};
      const meta = { url, ...redirect, contentType };

      // Route by sniffed bytes, not the content-type header — servers lie.
      // The path label comes from the URL pathname, with a Content-Type-derived
      // extension appended when the pathname lacks one (DOCX/XLSX/etc. are ZIP
      // containers that need extension disambiguation). Sniff for ZIP magic to
      // prefer modern OpenXML extensions when servers send legacy MIME types.
      const label = pathLabelForFetch(finalUrl, contentType, body);
      const detected = detectFileKind(body, label);
      if (detected.kind === "binary") {
        throw new Error(
          `Fetched content is ${detected.description} — webfetch returns text and images only. ` +
            "Use bash (curl -o) to download it if needed.",
        );
      }
      const content = await loadFileContent(body, label, {
        // The extraction cache keys on path + identity; fetch time makes each
        // fetch its own entry, so two fetches of a changed URL never collide.
        mtimeMs: Date.now(),
        size: body.byteLength,
      });
      switch (content.kind) {
        case "text": {
          const rendered = renderWebText(content.text, contentType, renderFormat, finalUrl);
          return {
            ...meta,
            format: renderFormat,
            ...(rendered.note === undefined ? {} : { note: rendered.note }),
            ...bounded(rendered.text, renderFormat, "text"),
          };
        }
        case "pdf":
          return {
            ...meta,
            source: "pdf" as const,
            pages: content.pages,
            ...bounded(content.text, renderFormat, "extracted"),
          };
        case "docx":
          return {
            ...meta,
            source: "docx" as const,
            ...bounded(content.text, renderFormat, "extracted"),
          };
        case "sheet":
          return {
            ...meta,
            source: "sheet" as const,
            sheetFormat: content.format,
            sheets: content.sheets,
            ...bounded(content.text, renderFormat, "extracted"),
          };
        case "image": {
          const imageMeta = {
            ...meta,
            source: "image" as const,
            imageFormat: content.format,
            width: content.width,
            height: content.height,
            bytes: body.byteLength,
          };
          if (!attachImagesToChat || body.byteLength > maxInlineImageBytes) {
            const why =
              attachImagesToChat && body.byteLength > maxInlineImageBytes
                ? `too large to attach automatically (${body.byteLength} bytes, max ${maxInlineImageBytes})`
                : "cannot be returned as a tool result (text/json only)";
            return {
              ...imageMeta,
              note: `Image content ${why}. If you need to see this image, ask the user to attach it to the chat.`,
            };
          }
          const attachment: ImageChatAttachment = {
            kind: "image",
            dataUrl: `data:${imageMediaType(content.format)};base64,${body.toString("base64")}`,
            mediaType: imageMediaType(content.format),
            filename: imageFilename(finalUrl),
            width: content.width,
            height: content.height,
          };
          return {
            ...imageMeta,
            note: "This image is queued and will be attached to your next message as a viewable image — no need to ask the user to attach it.",
            [CHAT_ATTACHMENT_FIELD]: attachment,
          };
        }
      }
    },
    // Same contract as `read`: the attachment bytes ride the raw result for a
    // connected client; the model sees metadata + the note only.
    toModelOutput(output) {
      if (
        typeof output === "object" &&
        output !== null &&
        CHAT_ATTACHMENT_FIELD in output
      ) {
        const { [CHAT_ATTACHMENT_FIELD]: _omitted, ...rest } = output;
        return { type: "json", value: rest };
      }
      return { type: "json", value: output };
    },
  });
}
