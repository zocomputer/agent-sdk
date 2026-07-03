import { Client } from "eve/client";
import { defineHook } from "eve/hooks";
import type { ImageChatAttachment } from "./attachments";
import {
  createParkDeliveryState,
  setParkNotificationHandler,
  type ParkDeliveryRequest,
} from "./park-delivery";
import {
  buildRedeliveryMessage,
  redeliveryFromEvent,
  type RedeliveryMessagePart,
} from "./redeliver";

// The effectful half of park delivery (pure core: ./park-delivery.ts). An
// agent wires it as one hook file:
//
//   // agent/hooks/park-delivery.ts
//   import { createParkDeliveryHook } from "@zocomputer/agent-sdk";
//   export default createParkDeliveryHook();
//
// Two producers feed it:
// - **Read images** (./redeliver.ts): `action.result` events carry read's raw
//   output (bytes included — toModelOutput only narrows what the model sees);
//   on park the images go back into the session as a real user turn.
// - **Background-task notifications** (./watch-output.ts): a bash/run_async
//   watcher match or a completion notice posted through the notification
//   bridge; delivered on park — or immediately, when the match lands while
//   the session is already parked (a background task finishing mid-park is
//   the whole point of the feature).
//
// The send goes through eve's HTTP API on loopback — the hook context hands us
// the continuation token, and eve's localDev auth accepts loopback callers.
// Server-side by construction: no browser, no cockpit, no host app.
//
// Hooks are observe-only for *model context*, so this doesn't inject anything
// mid-turn — it starts the NEXT turn, exactly like a user hitting send. The
// send is fire-and-forget from the handler (awaiting it would stall eve's hook
// dispatch on a POST back into the same process) with a short retry ladder:
// the park→send window can race turn finalization or a real user message, and
// a send that still fails re-queues for the session's next park.

const RETRY_DELAYS_MS = [500, 2_000, 5_000];

/** What one park delivery carries: a read image or a notification text. */
type DeliveryPayload =
  | { readonly kind: "image"; readonly attachment: ImageChatAttachment }
  | { readonly kind: "note"; readonly text: string };

function buildDeliveryMessage(
  request: ParkDeliveryRequest<DeliveryPayload>,
): RedeliveryMessagePart[] {
  const images = request.items.flatMap((item) =>
    item.payload.kind === "image"
      ? [{ toolCallId: item.key, attachment: item.payload.attachment }]
      : [],
  );
  const notes = request.items.flatMap((item) =>
    item.payload.kind === "note" ? [item.payload.text] : [],
  );
  return [
    ...(images.length > 0 ? buildRedeliveryMessage(images) : []),
    ...notes.map((text) => ({ type: "text" as const, text })),
  ];
}

export interface ParkDeliveryOptions {
  /**
   * Base URL of this agent's own eve server. Defaults to loopback on the
   * server's port (`$PORT`, eve dev's default 2000 otherwise).
   */
  serverUrl?: string;
  /** Log a line per delivery/failure (default true — it explains agent turns). */
  log?: boolean;
}

export function createParkDeliveryHook(options: ParkDeliveryOptions = {}) {
  const serverUrl =
    options.serverUrl ?? `http://127.0.0.1:${process.env.PORT ?? "2000"}`;
  const log = options.log ?? true;
  const state = createParkDeliveryState<DeliveryPayload>();

  async function deliver(request: ParkDeliveryRequest<DeliveryPayload>): Promise<void> {
    const client = new Client({ host: serverUrl });
    const message = buildDeliveryMessage(request);
    for (let attempt = 0; ; attempt++) {
      try {
        const session = client.session({
          sessionId: request.sessionId,
          continuationToken: request.continuationToken,
          streamIndex: 0,
        });
        const response = await session.send({ message });
        // The continue route echoes the target session id; a mismatch means
        // eve get-or-created a NEW session (a stale/mis-scoped token) — that's
        // a failed delivery even though the POST succeeded.
        if (response.sessionId !== request.sessionId) {
          throw new Error(
            `park delivery landed on ${response.sessionId} instead of ${request.sessionId} (continuation token mismatch)`,
          );
        }
        // Drain the turn acknowledgement; the turn itself streams to whoever
        // is watching the session. We only need the send to be accepted.
        await response.result();
        const next = state.settle(request, true);
        if (log) {
          const labels = request.items.map((item) =>
            item.payload.kind === "image" ? item.payload.attachment.filename : item.key,
          );
          console.log(
            `[agent-sdk] park delivery to ${request.sessionId}: ${labels.join(", ")}`,
          );
        }
        // Items may have queued while we were delivering; dispatch them now.
        if (next) void deliver(next);
        return;
      } catch (error) {
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined) {
          state.settle(request, false);
          if (log) {
            console.warn(
              `[agent-sdk] park delivery to ${request.sessionId} failed; will retry on next park:`,
              error,
            );
          }
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Tool code (bash watchers, run_async completion notices) posts through the
  // process-global bridge; a notification arriving while the session is
  // parked returns a request right here — no stream event will fire for it.
  setParkNotificationHandler((sessionId, notification) => {
    const request = state.enqueue(sessionId, {
      key: notification.key,
      payload: { kind: "note", text: notification.text },
    });
    if (request) void deliver(request);
  });

  return defineHook({
    events: {
      "*"(event, ctx) {
        const meta = {
          sessionId: ctx.session.id,
          continuationToken: ctx.channel.continuationToken,
        };
        const request = state.observe(event, meta);
        if (request) void deliver(request);
        const found = redeliveryFromEvent(event);
        if (found) {
          // Images arrive on action.result (a non-waiting event), so this
          // enqueue never fires an immediate delivery — they ride the park.
          state.enqueue(meta.sessionId, {
            key: found.toolCallId,
            payload: { kind: "image", attachment: found.attachment },
          });
        }
      },
    },
  });
}
