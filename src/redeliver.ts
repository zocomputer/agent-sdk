// Media redelivery: decide, from the runtime event stream, when a read
// image/video/audio file should be re-sent to the session as a real user
// message part.
//
// eve tool results are text/json, so `read` smuggles media bytes out on its raw
// result under CHAT_ATTACHMENT_FIELD (model-hidden via toModelOutput — see
// ./attachments.ts). Hooks receive that raw output on `action.result`, and
// `session.waiting` marks the session parked and deliverable. This module is
// the media-flavored client of the generic park-delivery core
// (./park-delivery.ts): extraction + message shape live here, the
// queue/park/settle state machine lives there, and the effectful hook
// (./hooks.ts) performs the actual send.

import {
  readChatAttachment,
  type ChatAttachment,
} from "./attachments";
import {
  clientContinuationToken,
  createParkDeliveryState,
} from "./park-delivery";

export { clientContinuationToken };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface PendingRedelivery {
  readonly toolCallId: string;
  readonly attachment: ChatAttachment;
}

/**
 * Extract a read-media attachment from an `action.result` stream event, if the
 * completed tool's raw output carries one. Structural (no eve types) and
 * tool-name-agnostic: any tool that returns a `CHAT_ATTACHMENT_FIELD` payload
 * participates.
 */
export function redeliveryFromEvent(event: unknown): PendingRedelivery | null {
  if (!isRecord(event) || event.type !== "action.result") return null;
  if (!isRecord(event.data)) return null;
  const result = event.data.result;
  if (!isRecord(result) || result.kind !== "tool-result") return null;
  if (typeof result.callId !== "string" || result.callId.length === 0) return null;
  const attachment = readChatAttachment(result.output);
  if (!attachment) return null;
  return { toolCallId: result.callId, attachment };
}

/** The message parts a redelivery turn sends (AI SDK `UserContent`-shaped). */
export type RedeliveryMessagePart =
  | { readonly type: "text"; readonly text: string }
  | {
      readonly type: "file";
      readonly data: string;
      readonly mediaType: string;
      readonly filename: string;
    };

/**
 * Build the user turn that carries the pending media. A short text part names
 * the files (so transcripts show what arrived); the file parts carry the
 * bytes the model was promised by read's "queued" note.
 */
export function buildRedeliveryMessage(
  pending: readonly PendingRedelivery[],
): RedeliveryMessagePart[] {
  const names = pending.map((p) => p.attachment.filename).join(", ");
  return [
    { type: "text", text: `Attached: ${names} (auto-attached from read).` },
    ...pending.map((p) => ({
      type: "file" as const,
      data: p.attachment.dataUrl,
      mediaType: p.attachment.mediaType,
      filename: p.attachment.filename,
    })),
  ];
}

export interface RedeliveryRequest {
  readonly sessionId: string;
  readonly continuationToken: string;
  readonly pending: readonly PendingRedelivery[];
}

/**
 * Per-process redelivery state across sessions: the generic park-delivery
 * state machine specialized to read-media attachments. Feed it every stream
 * event via `observe`; it returns a `RedeliveryRequest` exactly when a parked
 * session has media to deliver. The caller performs the send and reports back
 * with `settle` — on failure the media re-queue for the session's next park.
 *
 * Dedup is by tool call id for the session's lifetime in this process, so an
 * attachment never delivers twice even if a failed send races a user message.
 */
export function createRedeliveryState() {
  const core = createParkDeliveryState<ChatAttachment>();

  function toRequest(
    request: ReturnType<typeof core.observe>,
  ): RedeliveryRequest | null {
    if (!request) return null;
    return {
      sessionId: request.sessionId,
      continuationToken: request.continuationToken,
      pending: request.items.map((item) => ({
        toolCallId: item.key,
        attachment: item.payload,
      })),
    };
  }

  return {
    /**
     * Consume one stream event. `continuationToken` is the hook's runtime
     * (namespaced) token when known — latest wins; it's translated to the
     * client-facing token the continue route accepts.
     */
    observe(
      event: unknown,
      meta: { readonly sessionId: string; readonly continuationToken?: string },
    ): RedeliveryRequest | null {
      // Observe first: an attachment always arrives on an action.result (a
      // non-waiting event), so enqueue never fires an immediate delivery here
      // — media release on the park, exactly as before the extraction.
      const request = toRequest(core.observe(event, meta));
      const found = redeliveryFromEvent(event);
      if (found) {
        core.enqueue(meta.sessionId, {
          key: found.toolCallId,
          payload: found.attachment,
        });
      }
      return request;
    },

    /** Report the send outcome; a failed send re-queues for the next park. */
    settle(request: RedeliveryRequest, ok: boolean): void {
      core.settle(
        {
          sessionId: request.sessionId,
          continuationToken: request.continuationToken,
          items: request.pending.map((p) => ({
            key: p.toolCallId,
            payload: p.attachment,
          })),
        },
        ok,
      );
    },
  };
}

export type RedeliveryState = ReturnType<typeof createRedeliveryState>;
