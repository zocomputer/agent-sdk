import { defineTool } from "eve/tools";
import { z } from "zod";
import { join } from "node:path";
import { createBoundedCapture } from "../bounded-output";
import { audioMediaType, detectFileKind, videoMediaType } from "../file-kind";
import { loadFileContent } from "../read-file-content";
import { buildMediaHint } from "./read";
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
// spreadsheets route through the same extractors as `read`, and media returns
// metadata instead of decoding to garbage. The fetch/
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
  "application/epub+zip": ".epub",
  "application/rtf": ".rtf",
  "text/rtf": ".rtf",
  "application/x-ipynb+json": ".ipynb",
  // Media types matter only for formats whose magic bytes are ambiguous
  // without a path hint (EBML webm/mkv, bare-frame-sync mp3); listed broadly
  // so extensionless media URLs still label sensibly.
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-matroska": ".mkv",
  "video/x-msvideo": ".avi",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/flac": ".flac",
  "audio/mp4": ".m4a",
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

/**
 * Default in-context character budget for the inline-first mode (no
 * `spillDir`): the whole rendered content returns inline up to this, then
 * head+tail truncation. ~25k tokens — markdownified pages are compact, so
 * most land far under it; the cap is the "extremely long" ceiling and a
 * context-cost knob (tool results enter the transcript permanently).
 */
export const DEFAULT_MAX_INLINE_CONTENT_CHARS = 100_000;

// Inline-first keeps most of the budget at the head (the extracted main
// content reads top-down) but preserves a tail slice so the end of a long
// page — footers, appendices, the last table — survives truncation.
const INLINE_TAIL_FRACTION = 0.25;

/** Build the webfetch tool that fetches URLs, renders HTML to markdown, extracts documents, and describes media. */
export function createWebFetchTool(opts: {
  workspace: Workspace;
  /**
   * Where oversized output spills as a file the truncation marker names —
   * the right mode wherever `read` shares a filesystem with this tool (a
   * local agent): content over ~50k chars truncates head+tail and the
   * complete output lands on disk. **Omit for the inline-first mode** (the
   * hosted/split-topology default, where a spill would land on the eve
   * process's disk that the sandbox-backed `read` can't reach): the whole
   * rendered content returns inline up to `maxInlineContentChars`, then
   * truncates head+tail with no file to point at.
   */
  spillDir?: string;
  /**
   * Inline-first mode's character budget (no effect when `spillDir` is
   * set). Defaults to {@link DEFAULT_MAX_INLINE_CONTENT_CHARS}.
   */
  maxInlineContentChars?: number;
  /**
   * The "what to do instead" sentence in the image result note when the
   * pixels can't be delivered (attach disabled or over the size cap).
   * Defaults to asking the user to attach the image; agents without HITL
   * (e.g. task subagents) substitute advice that's actually actionable.
   */
  imageUnavailableHint?: string;
  /**
   * The "what to do instead" sentence in the video/audio result note when
   * the bytes can't be delivered (attach disabled — the default — or over
   * the cap). Defaults to the bash download suggestion; agents with a look
   * oracle route to download-then-look instead.
   */
  mediaUnavailableHint?: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: FetchLike | undefined;
}) {
  const { workspace, spillDir, fetchImpl } = opts;
  const imageUnavailableHint =
    opts.imageUnavailableHint ??
    "If you need to see this image, ask the user to attach it to the chat.";
  const mediaUnavailableHint =
    opts.mediaUnavailableHint ??
    "Use bash (curl -o) to download it if you need to process it.";
  const maxInlineContentChars =
    opts.maxInlineContentChars ?? DEFAULT_MAX_INLINE_CONTENT_CHARS;
  const inlineTailChars = Math.floor(maxInlineContentChars * INLINE_TAIL_FRACTION);
  const inlineHeadChars = maxInlineContentChars - inlineTailChars;

  const bounded = (text: string, format: WebFetchFormat, kind: "text" | "extracted") => {
    // Two modes, decided at factory time: spill (tight inline budget, the
    // complete output on disk) vs inline-first (the whole content in the
    // result up to the cap, nothing on disk). createBoundedCapture reports
    // an untruncated result whenever head+tail hold everything contiguously,
    // so under the cap the inline-first mode returns the exact content.
    const capture =
      spillDir !== undefined
        ? (() => {
            const spillPath = join(spillDir, spillFilename(format, kind));
            return createBoundedCapture({
              spillPath,
              spillLabel: workspace.relativize(spillPath),
            });
          })()
        : createBoundedCapture({
            headChars: inlineHeadChars,
            tailChars: inlineTailChars,
          });
    capture.append(text);
    const snapshot = capture.snapshot();
    return {
      content: snapshot.text,
      totalChars: snapshot.totalChars,
      truncated: snapshot.truncated,
    };
  };

  const mediaHint = buildMediaHint("fetching");

  // Static per factory build (prompt-cache safe): the overflow sentence
  // matches the bounding mode.
  const overflowHint =
    spillDir !== undefined
      ? "Content over the in-context budget is truncated head+tail and the complete output is spilled to a file named in the truncation marker — read or grep that file instead of re-fetching."
      : "Content returns whole; only extremely long pages truncate head+tail (the marker shows the boundary) — refetch a narrower page or a more specific URL if the middle matters.";

  return defineTool({
    description:
      `Fetch a URL and return its content in context. HTML pages are reduced to their main content with Defuddle (boilerplate stripped, title/author/date header) and converted to readable markdown by default (set format to "text" for plain text or "html" for the raw page). This is one read-only request, not a browser session or a durable clipping workflow. Fetched documents (PDF, DOCX/ODT/RTF, PPTX/ODP, spreadsheets, EPUB, Jupyter notebooks) are converted to plain text; ${mediaHint}. ${overflowHint} Default timeout ${WEB_FETCH_DEFAULT_TIMEOUT_SECONDS}s (${WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS}s for PDFs), max ${WEB_FETCH_MAX_TIMEOUT_SECONDS}s; responses over 5 MB error.`,
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
    async execute({ url, format, timeout }, ctx) {
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
        ...(fetchImpl !== undefined ? { fetchImpl } : {}),
        ...(ctx?.abortSignal !== undefined ? { abortSignal: ctx.abortSignal } : {}),
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
          `Fetched content is ${detected.description} — webfetch returns text and media metadata only. ` +
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
        case "pptx":
        case "odp":
          return {
            ...meta,
            source: content.kind,
            slides: content.slides,
            ...bounded(content.text, renderFormat, "extracted"),
          };
        case "odt":
        case "rtf":
          return {
            ...meta,
            source: content.kind,
            ...bounded(content.text, renderFormat, "extracted"),
          };
        case "epub":
          return {
            ...meta,
            source: "epub" as const,
            sections: content.sections,
            ...bounded(content.text, renderFormat, "extracted"),
          };
        case "ipynb":
          return {
            ...meta,
            source: "ipynb" as const,
            cells: content.cells,
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
          return {
            ...imageMeta,
            note: `Image content cannot be returned as a tool result (text/json only). ${imageUnavailableHint}`,
          };
        }
        case "video":
        case "audio": {
          const kind = content.kind;
          const mediaType =
            kind === "video"
              ? videoMediaType(content.format)
              : audioMediaType(content.format);
          // `format` names the render format on text results (and imageFormat/
          // sheetFormat theirs), so media keeps the same disambiguation.
          const mediaMeta = {
            ...meta,
            source: kind,
            mediaFormat: content.format,
            mediaType,
            bytes: body.byteLength,
          };
          return {
            ...mediaMeta,
            note: `${kind === "video" ? "Video" : "Audio"} content cannot be returned as a tool result (text/json only). ${mediaUnavailableHint}`,
          };
        }
      }
    },
  });
}
