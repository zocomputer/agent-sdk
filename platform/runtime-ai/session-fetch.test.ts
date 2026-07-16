import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  EVE_SESSION_HEADER,
  EVE_SUBAGENT_SESSION_HEADER,
  EVE_TURN_HEADER,
  ambientControlPlaneSessionId,
  ambientEveSessionId,
  ambientEveTurnId,
  ambientSessionCapability,
  ambientSessionParent,
  eveSessionFetch,
} from "./session-fetch";

type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit = Parameters<typeof globalThis.fetch>[1];
type Captured = { input: FetchInput; init: FetchInit };

function captureFetch(): { calls: Captured[]; fetch: typeof globalThis.fetch } {
  const calls: Captured[] = [];
  const fetchImpl = Object.assign((input: FetchInput, init?: FetchInit) => {
    calls.push({ input, init });
    return Promise.resolve(new Response(null));
  }, globalThis.fetch);
  return { calls, fetch: fetchImpl };
}

function headerOf(call: Captured, name: string): string | null {
  return new Headers(call.init?.headers).get(name);
}

function onlyCall(calls: Captured[]): Captured {
  const call = calls[0];
  if (!call || calls.length !== 1) throw new Error("expected exactly one fetch call");
  return call;
}

describe("eveSessionFetch", () => {
  test("stamps the session id on the request", async () => {
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(() => "ses-123", fetch);
    await wrapped("https://api.example.com/v4/ai", { method: "POST", body: "{}" });
    const call = onlyCall(calls);
    expect(headerOf(call, EVE_SESSION_HEADER)).toBe("ses-123");
    expect(call.init?.method).toBe("POST");
    expect(call.init?.body).toBe("{}");
  });

  test("preserves existing init headers alongside the stamp", async () => {
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(() => "ses-123", fetch);
    await wrapped("https://api.example.com/v4/ai", {
      headers: { "x-zo-agent-token": "tok", "content-type": "application/json" },
    });
    const call = onlyCall(calls);
    expect(headerOf(call, "x-zo-agent-token")).toBe("tok");
    expect(headerOf(call, "content-type")).toBe("application/json");
    expect(headerOf(call, EVE_SESSION_HEADER)).toBe("ses-123");
  });

  test("overwrites a stale pre-existing session header", async () => {
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(() => "ses-new", fetch);
    await wrapped("https://api.example.com/v4/ai", {
      headers: { [EVE_SESSION_HEADER]: "ses-old" },
    });
    expect(headerOf(onlyCall(calls), EVE_SESSION_HEADER)).toBe("ses-new");
  });

  test("no session in scope → request passes through untouched", async () => {
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(() => undefined, fetch);
    const init = { headers: { "x-zo-agent-token": "tok" } };
    await wrapped("https://api.example.com/v4/ai", init);
    const call = onlyCall(calls);
    // The exact init object, not a rebuilt copy — untouched means untouched.
    expect(call.init).toBe(init);
    expect(headerOf(call, EVE_SESSION_HEADER)).toBeNull();
  });

  test("blank session id counts as absent", async () => {
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(() => "   ", fetch);
    await wrapped("https://api.example.com/v4/ai");
    expect(onlyCall(calls).init).toBeUndefined();
  });

  test("stamps the turn id alongside the session id", async () => {
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(() => "ses-123", fetch, () => "turn-9");
    await wrapped("https://api.example.com/v4/ai");
    const call = onlyCall(calls);
    expect(headerOf(call, EVE_SESSION_HEADER)).toBe("ses-123");
    expect(headerOf(call, EVE_TURN_HEADER)).toBe("turn-9");
  });

  test("no turn in scope → only the session header", async () => {
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(() => "ses-123", fetch, () => undefined);
    await wrapped("https://api.example.com/v4/ai");
    const call = onlyCall(calls);
    expect(headerOf(call, EVE_SESSION_HEADER)).toBe("ses-123");
    expect(headerOf(call, EVE_TURN_HEADER)).toBeNull();
  });

  test("a stale pre-existing turn header is overwritten or removed (ambient is authoritative)", async () => {
    const { calls, fetch } = captureFetch();
    // Ambient turn present → stale value overwritten.
    const withTurn = eveSessionFetch(() => "ses-123", fetch, () => "turn-new");
    await withTurn("https://api.example.com/v4/ai", {
      headers: { [EVE_TURN_HEADER]: "turn-stale" },
    });
    expect(headerOf(onlyCall(calls), EVE_TURN_HEADER)).toBe("turn-new");
    // Ambient turn absent → stale value removed, never forwarded.
    calls.length = 0;
    const withoutTurn = eveSessionFetch(() => "ses-123", fetch, () => undefined);
    await withoutTurn("https://api.example.com/v4/ai", {
      headers: { [EVE_TURN_HEADER]: "turn-stale" },
    });
    const call = calls[0];
    if (!call) throw new Error("fetch not called");
    expect(headerOf(call, EVE_TURN_HEADER)).toBeNull();
    expect(headerOf(call, EVE_SESSION_HEADER)).toBe("ses-123");
  });

  test("a turn with no session stamps nothing (unjoinable noise)", async () => {
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(() => undefined, fetch, () => "turn-9");
    await wrapped("https://api.example.com/v4/ai");
    const call = onlyCall(calls);
    expect(headerOf(call, EVE_SESSION_HEADER)).toBeNull();
    expect(headerOf(call, EVE_TURN_HEADER)).toBeNull();
  });

  test("a root session (no ambient parent) stamps its own id and no subagent header", async () => {
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(() => "ses-root", fetch, () => undefined, () => null);
    await wrapped("https://api.example.com/v4/ai");
    const call = onlyCall(calls);
    expect(headerOf(call, EVE_SESSION_HEADER)).toBe("ses-root");
    expect(headerOf(call, EVE_SUBAGENT_SESSION_HEADER)).toBeNull();
  });

  test("a subagent child bills to the ROOT id and rides its own id on the subagent header", async () => {
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(
      () => "ses-child",
      fetch,
      () => "turn-child",
      () => ({ rootSessionId: "ses-root", sessionId: "ses-parent" }),
    );
    await wrapped("https://api.example.com/v4/ai");
    const call = onlyCall(calls);
    expect(headerOf(call, EVE_SESSION_HEADER)).toBe("ses-root");
    expect(headerOf(call, EVE_SUBAGENT_SESSION_HEADER)).toBe("ses-child");
    // The child's own turn keeps riding as-is (descriptive-only, documented).
    expect(headerOf(call, EVE_TURN_HEADER)).toBe("turn-child");
  });

  test("a malformed parent (reader → null) falls back to the session's own id", async () => {
    const { calls, fetch } = captureFetch();
    // ambientSessionParent's structural guards collapse any malformed slot to null;
    // the wrapper then bills to the session's own id with no subagent header.
    const wrapped = eveSessionFetch(() => "ses-child", fetch, () => undefined, () => null);
    await wrapped("https://api.example.com/v4/ai");
    const call = onlyCall(calls);
    expect(headerOf(call, EVE_SESSION_HEADER)).toBe("ses-child");
    expect(headerOf(call, EVE_SUBAGENT_SESSION_HEADER)).toBeNull();
  });

  test("a stale pre-existing subagent header is overwritten or removed (ambient lineage is authoritative)", async () => {
    const { calls, fetch } = captureFetch();
    // Ambient parent present → stale value overwritten with the child's own id.
    const asChild = eveSessionFetch(
      () => "ses-child",
      fetch,
      () => undefined,
      () => ({ rootSessionId: "ses-root", sessionId: "ses-parent" }),
    );
    await asChild("https://api.example.com/v4/ai", {
      headers: { [EVE_SUBAGENT_SESSION_HEADER]: "ses-stale" },
    });
    expect(headerOf(onlyCall(calls), EVE_SUBAGENT_SESSION_HEADER)).toBe("ses-child");
    // Ambient parent absent → stale value removed, never forwarded.
    calls.length = 0;
    const asRoot = eveSessionFetch(() => "ses-root", fetch, () => undefined, () => null);
    await asRoot("https://api.example.com/v4/ai", {
      headers: { [EVE_SUBAGENT_SESSION_HEADER]: "ses-stale" },
    });
    const call = calls[0];
    if (!call) throw new Error("fetch not called");
    expect(headerOf(call, EVE_SUBAGENT_SESSION_HEADER)).toBeNull();
    expect(headerOf(call, EVE_SESSION_HEADER)).toBe("ses-root");
  });

  test("a parent with no session stamps nothing (the subagent header only rides with a session)", async () => {
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(
      () => undefined,
      fetch,
      () => undefined,
      () => ({ rootSessionId: "ses-root", sessionId: "ses-parent" }),
    );
    await wrapped("https://api.example.com/v4/ai");
    const call = onlyCall(calls);
    expect(headerOf(call, EVE_SESSION_HEADER)).toBeNull();
    expect(headerOf(call, EVE_SUBAGENT_SESSION_HEADER)).toBeNull();
  });

  test("carries a Request input's headers when no init is given", async () => {
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(() => "ses-123", fetch);
    const request = new Request("https://api.example.com/v4/ai", {
      headers: { "x-zo-agent-token": "tok" },
    });
    await wrapped(request);
    const call = onlyCall(calls);
    expect(headerOf(call, "x-zo-agent-token")).toBe("tok");
    expect(headerOf(call, EVE_SESSION_HEADER)).toBe("ses-123");
  });
});

describe("ambientEveSessionId", () => {
  const SLOT = Symbol.for("eve.context-storage");

  function withSlot<T>(value: unknown, run: () => T): T {
    const had = Reflect.has(globalThis, SLOT);
    const prior: unknown = Reflect.get(globalThis, SLOT);
    Reflect.set(globalThis, SLOT, value);
    try {
      return run();
    } finally {
      if (had) Reflect.set(globalThis, SLOT, prior);
      else Reflect.deleteProperty(globalThis, SLOT);
    }
  }

  test("reads the session id from the published storage slot", () => {
    const storage = {
      getStore: () => ({
        get: (key: { name: string }) =>
          key.name === "eve.sessionId" ? "ses-ambient" : undefined,
      }),
    };
    expect(withSlot(storage, () => ambientEveSessionId())).toBe("ses-ambient");
  });

  test("no storage slot → undefined", () => {
    const had = Reflect.has(globalThis, SLOT);
    const prior: unknown = Reflect.get(globalThis, SLOT);
    Reflect.deleteProperty(globalThis, SLOT);
    try {
      expect(ambientEveSessionId()).toBeUndefined();
    } finally {
      if (had) Reflect.set(globalThis, SLOT, prior);
    }
  });

  test("outside any session scope (getStore undefined) → undefined", () => {
    const storage = { getStore: () => undefined };
    expect(withSlot(storage, () => ambientEveSessionId())).toBeUndefined();
  });

  test("ambientEveTurnId reads session.turn.id, rejecting malformed shapes", () => {
    const storageOf = (value: unknown) => ({
      getStore: () => ({
        get: (key: { name: string }) => (key.name === "eve.session" ? value : undefined),
      }),
    });
    expect(
      withSlot(storageOf({ sessionId: "s", turn: { id: "turn-1", sequence: 0 } }), () =>
        ambientEveTurnId(),
      ),
    ).toBe("turn-1");
    expect(withSlot(storageOf(null), () => ambientEveTurnId())).toBeUndefined();
    expect(withSlot(storageOf({ turn: null }), () => ambientEveTurnId())).toBeUndefined();
    expect(withSlot(storageOf({ turn: { id: 42 } }), () => ambientEveTurnId())).toBeUndefined();
    expect(withSlot(storageOf({ turn: { id: "  " } }), () => ambientEveTurnId())).toBeUndefined();
  });

  test("ambientSessionCapability reads current auth before the durable initiator", () => {
    const storageOf = (value: unknown) => ({
      getStore: () => ({
        get: (key: { name: string }) =>
          key.name === "eve.session" ? value : undefined,
      }),
    });
    expect(
      withSlot(
        storageOf({
          auth: {
            current: { attributes: { zoSessionCapability: "current-cap" } },
            initiator: { attributes: { zoSessionCapability: "initiator-cap" } },
          },
        }),
        () => ambientSessionCapability(),
      ),
    ).toBe("current-cap");
    expect(
      withSlot(
        storageOf({
          auth: {
            current: null,
            initiator: { attributes: { zoSessionCapability: "initiator-cap" } },
          },
        }),
        () => ambientSessionCapability(),
      ),
    ).toBe("initiator-cap");
    expect(withSlot(storageOf({ auth: {} }), () => ambientSessionCapability())).toBeUndefined();
  });

  test("non-string or blank slot value → undefined", () => {
    const storageOf = (value: unknown) => ({
      getStore: () => ({ get: () => value }),
    });
    expect(withSlot(storageOf(42), () => ambientEveSessionId())).toBeUndefined();
    expect(withSlot(storageOf("   "), () => ambientEveSessionId())).toBeUndefined();
  });

  test("ambientSessionParent reads eve.parentSession, rejecting malformed shapes", () => {
    const storageOf = (value: unknown) => ({
      getStore: () => ({
        get: (key: { name: string }) =>
          key.name === "eve.parentSession" ? value : undefined,
      }),
    });
    // The full SessionParent shape as eve seeds it; extra fields pass through unread.
    expect(
      withSlot(
        storageOf({
          callId: "call-1",
          rootSessionId: "ses-root",
          sessionId: "ses-parent",
          turn: { id: "turn-1", sequence: 0 },
        }),
        () => ambientSessionParent(),
      ),
    ).toEqual({ rootSessionId: "ses-root", sessionId: "ses-parent" });
    // Absent (a root session) and every malformed shape → null, never a throw.
    expect(withSlot(storageOf(undefined), () => ambientSessionParent())).toBeNull();
    expect(withSlot(storageOf(null), () => ambientSessionParent())).toBeNull();
    expect(withSlot(storageOf("ses-root"), () => ambientSessionParent())).toBeNull();
    expect(withSlot(storageOf({ sessionId: "ses-parent" }), () => ambientSessionParent())).toBeNull();
    expect(withSlot(storageOf({ rootSessionId: "ses-root" }), () => ambientSessionParent())).toBeNull();
    expect(
      withSlot(storageOf({ rootSessionId: 42, sessionId: "ses-parent" }), () => ambientSessionParent()),
    ).toBeNull();
    expect(
      withSlot(storageOf({ rootSessionId: "   ", sessionId: "ses-parent" }), () => ambientSessionParent()),
    ).toBeNull();
    expect(
      withSlot(storageOf({ rootSessionId: "ses-root", sessionId: "  " }), () => ambientSessionParent()),
    ).toBeNull();
  });

  test("ambientControlPlaneSessionId resolves a child to its root", () => {
    const storage = {
      getStore: () => ({
        get: (key: { name: string }) => {
          if (key.name === "eve.sessionId") return "ses-child";
          if (key.name === "eve.parentSession") {
            return { rootSessionId: "ses-root", sessionId: "ses-parent" };
          }
          return undefined;
        },
      }),
    };
    expect(withSlot(storage, () => ambientControlPlaneSessionId())).toBe(
      "ses-root",
    );
  });

  test("ambientSessionParent with no storage slot → null", () => {
    const had = Reflect.has(globalThis, SLOT);
    const prior: unknown = Reflect.get(globalThis, SLOT);
    Reflect.deleteProperty(globalThis, SLOT);
    try {
      expect(ambientSessionParent()).toBeNull();
    } finally {
      if (had) Reflect.set(globalThis, SLOT, prior);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Contract lock against the INSTALLED eve: the ambient read depends on eve's
// process-wide storage slot (`Symbol.for("eve.context-storage")`), its container's
// `get({ name })` shape, and the `eve.sessionId` key name. eve doesn't export these
// publicly, so this test deep-imports eve's own modules by file path (eve is a
// devDependency here for exactly this) and drives the REAL container through the
// wrapper — an eve upgrade that moves any part of the handshake fails this test.
// ─────────────────────────────────────────────────────────────────────────────
describe("eve contract", () => {
  async function eveInternals() {
    const require = createRequire(import.meta.url);
    const evePkg = require.resolve("eve/package.json");
    const eveRoot = dirname(evePkg);
    const containerMod: unknown = await import(
      pathToFileURL(join(eveRoot, "dist/src/context/container.js")).href
    );
    const keysMod: unknown = await import(
      pathToFileURL(join(eveRoot, "dist/src/context/keys.js")).href
    );
    return { containerMod, keysMod };
  }

  test("session id set via eve's real ALS container is stamped by the wrapper", async () => {
    const { containerMod, keysMod } = await eveInternals();
    // Runtime-checked reach into eve internals — this is the drift detector.
    const { ContextContainer, contextStorage } = containerMod as {
      ContextContainer: new () => {
        set(key: { name: string }, value: unknown): unknown;
      };
      contextStorage: {
        run<T>(store: unknown, fn: () => T): T;
      };
    };
    const { SessionIdKey, SessionKey } = keysMod as {
      SessionIdKey: { name: string };
      SessionKey: { name: string };
    };
    expect(SessionIdKey.name).toBe("eve.sessionId");
    expect(SessionKey.name).toBe("eve.session");
    // The lineage key the root-first billing read depends on (ambientSessionParent).
    const { ParentSessionKey } = keysMod as { ParentSessionKey: { name: string } };
    expect(ParentSessionKey.name).toBe("eve.parentSession");
    // Importing eve's container module published the storage on the global slot.
    expect(Reflect.get(globalThis, Symbol.for("eve.context-storage"))).toBe(
      contextStorage,
    );

    const container = new ContextContainer();
    container.set(SessionIdKey, "ses-real-eve");
    // The durable session object, as eve seeds it (the shape ambientEveTurnId reads).
    container.set(SessionKey, {
      sessionId: "ses-real-eve",
      auth: { current: null, initiator: null },
      turn: { id: "turn-real-eve", sequence: 3 },
    });

    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(undefined, fetch);
    await contextStorage.run(container, () =>
      wrapped("https://api.example.com/v4/ai", { method: "POST" }),
    );
    const call = onlyCall(calls);
    expect(headerOf(call, EVE_SESSION_HEADER)).toBe("ses-real-eve");
    expect(headerOf(call, EVE_TURN_HEADER)).toBe("turn-real-eve");
    // A root session (no ParentSessionKey seeded) rides no subagent header.
    expect(headerOf(call, EVE_SUBAGENT_SESSION_HEADER)).toBeNull();
  });

  test("subagent lineage seeded via eve's real container bills to the root", async () => {
    const { containerMod, keysMod } = await eveInternals();
    const { ContextContainer, contextStorage } = containerMod as {
      ContextContainer: new () => {
        set(key: { name: string }, value: unknown): unknown;
      };
      contextStorage: {
        run<T>(store: unknown, fn: () => T): T;
      };
    };
    const { ParentSessionKey, SessionIdKey, SessionKey } = keysMod as {
      ParentSessionKey: { name: string };
      SessionIdKey: { name: string };
      SessionKey: { name: string };
    };

    const container = new ContextContainer();
    container.set(SessionIdKey, "ses-child-eve");
    container.set(SessionKey, {
      sessionId: "ses-child-eve",
      auth: { current: null, initiator: null },
      turn: { id: "turn-child-eve", sequence: 0 },
    });
    // The SessionParent lineage as eve seeds it for a subagent dispatch
    // (execution/runtime-context.js) — the shape ambientSessionParent reads.
    container.set(ParentSessionKey, {
      callId: "call-real-eve",
      rootSessionId: "ses-root-eve",
      sessionId: "ses-parent-eve",
      turn: { id: "turn-parent-eve", sequence: 5 },
    });

    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(undefined, fetch);
    await contextStorage.run(container, () =>
      wrapped("https://api.example.com/v4/ai", { method: "POST" }),
    );
    const call = onlyCall(calls);
    // Billing session = the ROOT of the dispatch chain; the child's own id rides
    // the subagent header as descriptive detail.
    expect(headerOf(call, EVE_SESSION_HEADER)).toBe("ses-root-eve");
    expect(headerOf(call, EVE_SUBAGENT_SESSION_HEADER)).toBe("ses-child-eve");
    expect(headerOf(call, EVE_TURN_HEADER)).toBe("turn-child-eve");
  });

  test("outside the ALS scope the wrapper stamps nothing", async () => {
    // Force eve's real storage onto the slot (imported above), then fetch with no run().
    await eveInternals();
    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(undefined, fetch);
    await wrapped("https://api.example.com/v4/ai");
    expect(headerOf(onlyCall(calls), EVE_SESSION_HEADER)).toBeNull();
  });
});
