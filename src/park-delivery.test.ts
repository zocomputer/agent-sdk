import { afterEach, describe, expect, test } from "bun:test";
import {
  __resetParkNotificationBridgeForTests,
  clientContinuationToken,
  createParkDeliveryState,
  postParkNotification,
  setParkNotificationHandler,
  type ParkNotification,
} from "./park-delivery";

afterEach(() => __resetParkNotificationBridgeForTests());

const waiting = { type: "session.waiting", data: { wait: "next-user-message" } };
const active = { type: "turn.started", data: {} };
const meta = { sessionId: "s1", continuationToken: "tok-1" };

describe("createParkDeliveryState", () => {
  test("items queued while active release on the park", () => {
    const state = createParkDeliveryState<string>();
    expect(state.enqueue("s1", { key: "k1", payload: "hello" })).toBeNull();
    // The state hasn't seen a token yet — the enqueue can't know it.
    expect(state.observe(waiting, meta)).toEqual({
      sessionId: "s1",
      continuationToken: "tok-1",
      items: [{ key: "k1", payload: "hello" }],
    });
  });

  test("an item enqueued while parked emits immediately", () => {
    const state = createParkDeliveryState<string>();
    expect(state.observe(waiting, meta)).toBeNull(); // parked, nothing pending
    const request = state.enqueue("s1", { key: "k1", payload: "hello" });
    expect(request?.items).toEqual([{ key: "k1", payload: "hello" }]);
  });

  test("a non-waiting event marks the session active again", () => {
    const state = createParkDeliveryState<string>();
    state.observe(waiting, meta);
    state.observe(active, meta);
    expect(state.enqueue("s1", { key: "k1", payload: "x" })).toBeNull();
  });

  test("enqueue-while-parked without a token holds for a later park", () => {
    const state = createParkDeliveryState<string>();
    state.observe(waiting, { sessionId: "s1" });
    expect(state.enqueue("s1", { key: "k1", payload: "x" })).toBeNull();
    expect(state.observe(waiting, meta)).not.toBeNull();
  });

  test("dedupes by key across pending and delivered", () => {
    const state = createParkDeliveryState<string>();
    state.enqueue("s1", { key: "k1", payload: "x" });
    expect(state.enqueue("s1", { key: "k1", payload: "x" })).toBeNull();
    const request = state.observe(waiting, meta);
    expect(request?.items).toHaveLength(1);
    // Delivered keys stay delivered.
    expect(state.enqueue("s1", { key: "k1", payload: "x" })).toBeNull();
  });

  test("enqueueAll into a parked session emits ONE request with every item", () => {
    const state = createParkDeliveryState<string>();
    expect(state.observe(waiting, meta)).toBeNull(); // parked, nothing pending
    const request = state.enqueueAll("s1", [
      { key: "k1", payload: "one" },
      { key: "k2", payload: "two" },
      { key: "k3", payload: "three" },
    ]);
    expect(request?.items.map((i) => i.key)).toEqual(["k1", "k2", "k3"]);
  });

  test("enqueueAll skips delivered/pending duplicates and returns null when nothing new queued", () => {
    const state = createParkDeliveryState<string>();
    state.observe(waiting, meta);
    const first = state.enqueue("s1", { key: "k1", payload: "one" });
    expect(first).not.toBeNull();
    if (!first) throw new Error("expected a request");
    state.settle(first, true);
    // k1 already delivered — an all-duplicate batch queues nothing.
    expect(state.enqueueAll("s1", [{ key: "k1", payload: "one" }])).toBeNull();
    // A mixed batch delivers only the new item.
    const mixed = state.enqueueAll("s1", [
      { key: "k1", payload: "one" },
      { key: "k2", payload: "two" },
    ]);
    expect(mixed?.items.map((i) => i.key)).toEqual(["k2"]);
  });

  test("a failed send re-queues; enqueue-while-parked drains everything", () => {
    const state = createParkDeliveryState<string>();
    state.enqueue("s1", { key: "k1", payload: "x" });
    const request = state.observe(waiting, meta);
    if (!request) throw new Error("expected a request");
    state.settle(request, false);
    // Still parked: the next enqueue drains the re-queued item too.
    const retry = state.enqueue("s1", { key: "k2", payload: "y" });
    expect(retry?.items.map((i) => i.key).sort()).toEqual(["k1", "k2"]);
  });

  test("terminal events clear the session", () => {
    const state = createParkDeliveryState<string>();
    state.enqueue("s1", { key: "k1", payload: "x" });
    state.observe({ type: "session.completed", data: {} }, meta);
    expect(state.observe(waiting, meta)).toBeNull();
  });

  test("translates runtime-namespaced continuation tokens, latest wins", () => {
    const state = createParkDeliveryState<string>();
    state.enqueue("s1", { key: "k1", payload: "x" });
    state.observe(active, { sessionId: "s1", continuationToken: "eve:eve:1234" });
    const request = state.observe(waiting, { sessionId: "s1" });
    expect(request?.continuationToken).toBe("eve:1234");
  });
});

describe("clientContinuationToken", () => {
  test("strips the runtime namespace, keeps client-facing tokens", () => {
    expect(clientContinuationToken("eve:eve:1234-abcd")).toBe("eve:1234-abcd");
    expect(clientContinuationToken("eve:1234-abcd")).toBe("eve:1234-abcd");
    expect(clientContinuationToken("tok-1")).toBe("tok-1");
  });
});

describe("notification bridge", () => {
  test("posts reach a registered handler", () => {
    const seen: [string, ParkNotification][] = [];
    setParkNotificationHandler((sessionId, n) => seen.push([sessionId, n]));
    postParkNotification("s1", { key: "k1", text: "hi" });
    expect(seen).toEqual([["s1", { key: "k1", text: "hi" }]]);
  });

  test("posts made before a handler queue and flush on registration", () => {
    postParkNotification("s1", { key: "k1", text: "one" });
    postParkNotification("s2", { key: "k2", text: "two" });
    const seen: string[] = [];
    setParkNotificationHandler((sessionId, n) => seen.push(`${sessionId}:${n.key}`));
    expect(seen.sort()).toEqual(["s1:k1", "s2:k2"]);
  });

  test("the pre-handler queue is bounded per session", () => {
    for (let i = 0; i < 30; i++) {
      postParkNotification("s1", { key: `k${i}`, text: "x" });
    }
    const seen: string[] = [];
    setParkNotificationHandler((_sessionId, n) => seen.push(n.key));
    expect(seen).toHaveLength(20);
  });

  test("the latest handler wins (module-graph rebuild)", () => {
    const first: string[] = [];
    const second: string[] = [];
    setParkNotificationHandler((_s, n) => first.push(n.key));
    setParkNotificationHandler((_s, n) => second.push(n.key));
    postParkNotification("s1", { key: "k1", text: "x" });
    expect(first).toEqual([]);
    expect(second).toEqual(["k1"]);
  });
});
