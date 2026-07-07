// The chat-attachment contract for smuggling media past eve's text/json-only
// tool results. `read`/`webfetch` put a ChatAttachment on their raw execute()
// return under CHAT_ATTACHMENT_FIELD — a field the model never sees (stripped
// by the tool's toModelOutput) — and a connected client (or the park-delivery
// hook) reads it off the tool-result event (action.result / the reducer's
// dynamic-tool.output) and re-injects the media as a real user message part on
// the next turn.
//
// This module is deliberately dependency-free (no node:*, no extraction deps),
// so UI clients can import it via the `@zocomputer/agent-sdk/attachments`
// subpath without pulling the package's PDF/DOCX/spreadsheet graph into a
// browser bundle.

/** The result field carrying the model-hidden attachment. */
export const CHAT_ATTACHMENT_FIELD = "chatAttachment" as const;

/**
 * Default cap for inlining image bytes on a `read`/`webfetch` result: 3 MiB,
 * matching eve's attachment-staging hydration cap (`shouldInlineSandboxRefAsBytes`,
 * eve ≤0.19: images ≤3 MiB inline at model-call time; bigger ones hydrate as a
 * text stub). Staying under it keeps read's "queued" promise truthful on every
 * runtime — a bigger image gets the honest metadata-only note instead of
 * silently degrading after delivery.
 */
export const DEFAULT_MAX_INLINE_IMAGE_BYTES = 3 * 1024 * 1024;

/**
 * Default cap for inlining video/audio bytes: 10 MB, matching read's stat
 * guard (bigger files never reach the attach decision). Bounds durable-stream
 * bloat — the data URL rides the stream once per read/fetch.
 */
export const DEFAULT_MAX_INLINE_MEDIA_BYTES = 10 * 1024 * 1024;

/** Media kinds the attachment contract carries. Image delivery works with
 * every vision model; video/audio are provider-gated (the read/webfetch
 * factories only attach them when the consumer opts in). */
export type ChatAttachmentKind = "image" | "video" | "audio";

/** A model-hidden media payload smuggled on a read/webfetch result, carrying bytes as a data URL for client redelivery. */
export type ChatAttachment =
  | {
      readonly kind: "image";
      /** A `data:` URL (base64) — drop straight into an AI SDK file part's `data`. */
      readonly dataUrl: string;
      /** e.g. `image/png`, `image/jpeg`. */
      readonly mediaType: string;
      readonly filename: string;
      readonly width: number | null;
      readonly height: number | null;
    }
  | {
      readonly kind: "video";
      readonly dataUrl: string;
      /** e.g. `video/mp4`, `video/webm`. */
      readonly mediaType: string;
      readonly filename: string;
    }
  | {
      readonly kind: "audio";
      readonly dataUrl: string;
      /** e.g. `audio/mpeg`, `audio/wav`. */
      readonly mediaType: string;
      readonly filename: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read the model-hidden media attachment off a tool result, if present.
 * Matches by payload shape, not tool name, so it's agnostic to what a
 * consumer named its read tool. Returns null for any result without a valid
 * attachment.
 */
export function readChatAttachment(toolOutput: unknown): ChatAttachment | null {
  if (!isRecord(toolOutput)) return null;
  const raw = toolOutput[CHAT_ATTACHMENT_FIELD];
  if (!isRecord(raw)) return null;
  if (typeof raw.dataUrl !== "string" || raw.dataUrl.length === 0) return null;
  if (typeof raw.mediaType !== "string" || raw.mediaType.length === 0) return null;
  const base = {
    dataUrl: raw.dataUrl,
    mediaType: raw.mediaType,
  };
  switch (raw.kind) {
    case "image":
      return {
        kind: "image",
        ...base,
        filename: typeof raw.filename === "string" ? raw.filename : "image",
        width: typeof raw.width === "number" ? raw.width : null,
        height: typeof raw.height === "number" ? raw.height : null,
      };
    case "video":
      return {
        kind: "video",
        ...base,
        filename: typeof raw.filename === "string" ? raw.filename : "video",
      };
    case "audio":
      return {
        kind: "audio",
        ...base,
        filename: typeof raw.filename === "string" ? raw.filename : "audio",
      };
    default:
      return null;
  }
}
