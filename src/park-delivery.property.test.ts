// Property tests for the park-delivery core: a model-based sweep drives
// arbitrary observe/enqueue/settle sequences against a simple reference model
// and asserts the delivery contract at every step — a request only ever fires
// for a parked, reachable, idle session; a key delivers successfully at most
// once per session lifetime; a failed send re-queues everything it carried;
// and a batch enqueued into a parked session flushes as ONE request. Plus the
// `clientContinuationToken` namespace-stripping laws (idempotent, suffix-safe).

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  clientContinuationToken,
  createParkDeliveryState,
  type ParkDeliveryItem,
  type ParkDeliveryRequest,
} from "./park-delivery";

const SESSION = "session-1";
const RUNTIME_TOKEN = "eve:eve:tok-1"; // hook-side namespaced form
const CLIENT_TOKEN = "eve:tok-1"; // what the continue route accepts

const keyArb = fc.constantFrom("k1", "k2", "k3", "k4", "k5");

type Command =
  | { readonly op: "enqueue"; readonly keys: readonly string[] }
  | { readonly op: "waiting"; readonly withToken: boolean }
  | { readonly op: "activity" }
  | { readonly op: "completed" }
  | { readonly op: "settleOk" }
  | { readonly op: "settleFail" };

const commandArb: fc.Arbitrary<Command> = fc.oneof(
  fc.record({ op: fc.constant("enqueue" as const), keys: fc.array(keyArb, { minLength: 1, maxLength: 3 }) }),
  fc.record({ op: fc.constant("waiting" as const), withToken: fc.boolean() }),
  fc.constant({ op: "activity" } as const),
  fc.constant({ op: "completed" } as const),
  fc.constant({ op: "settleOk" } as const),
  fc.constant({ op: "settleFail" } as const),
);

interface Model {
  pending: Set<string>;
  deliveredOk: Set<string>;
  inflight: Set<string> | null;
  parked: boolean;
  tokenKnown: boolean;
}

function freshModel(): Model {
  return { pending: new Set(), deliveredOk: new Set(), inflight: null, parked: false, tokenKnown: false };
}

/** The model's drain: everything pending goes out when parked+reachable+idle. */
function expectDrain(
  model: Model,
  request: ParkDeliveryRequest<string> | null,
  shouldDrain: boolean,
): void {
  if (!shouldDrain) {
    expect(request).toBeNull();
    return;
  }
  expect(request).not.toBeNull();
  if (request === null) return;
  expect(request.sessionId).toBe(SESSION);
  expect(request.continuationToken).toBe(CLIENT_TOKEN);
  const keys = request.items.map((i) => i.key);
  expect(new Set(keys)).toEqual(model.pending);
  expect(new Set(keys).size).toBe(keys.length);
  // No successfully-delivered key ever rides a second request.
  for (const key of keys) expect(model.deliveredOk.has(key)).toBe(false);
  model.inflight = new Set(keys);
  model.pending = new Set();
}

describe("park-delivery state machine properties", () => {
  test("arbitrary command sequences follow the delivery contract exactly", () => {
    fc.assert(
      fc.property(fc.array(commandArb, { maxLength: 30 }), (commands) => {
        const state = createParkDeliveryState<string>();
        let model = freshModel();
        let outstanding: ParkDeliveryRequest<string> | null = null;

        const canDrain = (): boolean =>
          model.pending.size > 0 && model.tokenKnown && model.inflight === null;

        for (const command of commands) {
          switch (command.op) {
            case "enqueue": {
              const items: ParkDeliveryItem<string>[] = command.keys.map((key) => ({
                key,
                payload: `p-${key}`,
              }));
              const dedupe = new Set([
                ...model.pending,
                ...model.deliveredOk,
                ...(model.inflight ?? []),
              ]);
              const fresh = command.keys.filter((k, i) => !dedupe.has(k) && command.keys.indexOf(k) === i);
              const request = state.enqueueAll(SESSION, items);
              for (const key of fresh) model.pending.add(key);
              expectDrain(model, request, fresh.length > 0 && model.parked && canDrain());
              if (request !== null) outstanding = request;
              break;
            }
            case "waiting": {
              const request = state.observe(
                { type: "session.waiting" },
                {
                  sessionId: SESSION,
                  continuationToken: command.withToken ? RUNTIME_TOKEN : undefined,
                },
              );
              if (command.withToken) model.tokenKnown = true;
              model.parked = true;
              expectDrain(model, request, canDrain());
              if (request !== null) outstanding = request;
              break;
            }
            case "activity": {
              const request = state.observe(
                { type: "message.appended" },
                { sessionId: SESSION, continuationToken: RUNTIME_TOKEN },
              );
              model.tokenKnown = true;
              model.parked = false;
              expect(request).toBeNull();
              break;
            }
            case "completed": {
              const request = state.observe(
                { type: "session.completed" },
                { sessionId: SESSION },
              );
              expect(request).toBeNull();
              model = freshModel();
              outstanding = null;
              break;
            }
            case "settleOk": {
              if (outstanding === null || model.inflight === null) break;
              const request = state.settle(outstanding, true);
              for (const key of model.inflight) model.deliveredOk.add(key);
              model.inflight = null;
              outstanding = null;
              // Items queued during the delivery flush at once iff still parked.
              expectDrain(model, request, model.parked && canDrain());
              if (request !== null) outstanding = request;
              break;
            }
            case "settleFail": {
              if (outstanding === null || model.inflight === null) break;
              const request = state.settle(outstanding, false);
              expect(request).toBeNull();
              // Everything the failed send carried is pending again.
              for (const key of model.inflight) model.pending.add(key);
              model.inflight = null;
              outstanding = null;
              break;
            }
          }
        }
      }),
    );
  });

  test("a batch into a parked, reachable, idle session flushes as one request", () => {
    fc.assert(
      fc.property(fc.uniqueArray(keyArb, { minLength: 1, maxLength: 5 }), (keys) => {
        const state = createParkDeliveryState<string>();
        expect(
          state.observe(
            { type: "session.waiting" },
            { sessionId: SESSION, continuationToken: RUNTIME_TOKEN },
          ),
        ).toBeNull();
        const request = state.enqueueAll(
          SESSION,
          keys.map((key) => ({ key, payload: key })),
        );
        expect(request?.items.map((i) => i.key)).toEqual(keys);
      }),
    );
  });

  test("failed items always ride the next drain (nothing is lost)", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(keyArb, { minLength: 1, maxLength: 5 }),
        fc.boolean(),
        (keys, reparkFirst) => {
          const state = createParkDeliveryState<string>();
          state.observe(
            { type: "session.waiting" },
            { sessionId: SESSION, continuationToken: RUNTIME_TOKEN },
          );
          const first = state.enqueueAll(
            SESSION,
            keys.map((key) => ({ key, payload: key })),
          );
          expect(first).not.toBeNull();
          if (first === null) return;
          if (reparkFirst) {
            // The session resumed activity while the send was failing.
            state.observe({ type: "message.appended" }, { sessionId: SESSION });
          }
          expect(state.settle(first, false)).toBeNull();
          const second = state.observe(
            { type: "session.waiting" },
            { sessionId: SESSION, continuationToken: RUNTIME_TOKEN },
          );
          expect(second?.items.map((i) => i.key).sort()).toEqual([...keys].sort());
        },
      ),
    );
  });
});

describe("clientContinuationToken properties", () => {
  test("idempotent over arbitrary strings", () => {
    fc.assert(
      fc.property(fc.string(), (token) => {
        const once = clientContinuationToken(token);
        expect(clientContinuationToken(once)).toBe(once);
      }),
    );
  });

  test("returns the input or its after-first-colon suffix, never something else", () => {
    fc.assert(
      fc.property(fc.string(), (token) => {
        const result = clientContinuationToken(token);
        const sep = token.indexOf(":");
        if (result !== token) {
          expect(result).toBe(token.slice(sep + 1));
        }
      }),
    );
  });

  test("strips exactly one namespace layer from a namespaced client token", () => {
    const uuidLikeArb = fc.string({ minLength: 1, maxLength: 12, unit: fc.constantFrom(..."abcdef0123456789-") });
    fc.assert(
      fc.property(uuidLikeArb, (uuid) => {
        expect(clientContinuationToken(`eve:eve:${uuid}`)).toBe(`eve:${uuid}`);
      }),
    );
  });
});
