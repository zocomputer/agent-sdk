// The chat-attachment contract for smuggling media past eve's text/json-only
// tool results. `read` puts an ImageChatAttachment on its raw execute() return
// under CHAT_ATTACHMENT_FIELD — a field the model never sees (stripped by the
// tool's toModelOutput) — and a connected client reads it off the tool-result
// event (action.result / the reducer's dynamic-tool.output) and re-injects the
// image as a real user message part on the next turn.
//
// This module is deliberately dependency-free (no node:*, no extraction deps),
// so UI clients can import it via the `@zocomputer/agent-sdk/attachments`
// subpath without pulling the package's PDF/DOCX/spreadsheet graph into a
// browser bundle.

/** The result field carrying the model-hidden attachment. */
export const CHAT_ATTACHMENT_FIELD = "chatAttachment" as const;

export interface ImageChatAttachment {
  readonly kind: "image";
  /** A `data:` URL (base64) — drop straight into an AI SDK file part's `data`. */
  readonly dataUrl: string;
  /** e.g. `image/png`, `image/jpeg`. */
  readonly mediaType: string;
  readonly filename: string;
  readonly width: number | null;
  readonly height: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read the model-hidden image attachment off a tool result, if present. Matches
 * by payload shape, not tool name, so it's agnostic to what a consumer named
 * its read tool. Returns null for any result without a valid attachment.
 */
export function readImageChatAttachment(
  toolOutput: unknown,
): ImageChatAttachment | null {
  if (!isRecord(toolOutput)) return null;
  const raw = toolOutput[CHAT_ATTACHMENT_FIELD];
  if (!isRecord(raw)) return null;
  if (raw.kind !== "image") return null;
  if (typeof raw.dataUrl !== "string" || raw.dataUrl.length === 0) return null;
  if (typeof raw.mediaType !== "string" || raw.mediaType.length === 0) return null;
  return {
    kind: "image",
    dataUrl: raw.dataUrl,
    mediaType: raw.mediaType,
    filename: typeof raw.filename === "string" ? raw.filename : "image",
    width: typeof raw.width === "number" ? raw.width : null,
    height: typeof raw.height === "number" ? raw.height : null,
  };
}
