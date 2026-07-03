import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  EVE_SESSION_HEADER,
  ambientEveSessionId,
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

  test("non-string or blank slot value → undefined", () => {
    const storageOf = (value: unknown) => ({
      getStore: () => ({ get: () => value }),
    });
    expect(withSlot(storageOf(42), () => ambientEveSessionId())).toBeUndefined();
    expect(withSlot(storageOf("   "), () => ambientEveSessionId())).toBeUndefined();
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
    const { SessionIdKey } = keysMod as { SessionIdKey: { name: string } };
    expect(SessionIdKey.name).toBe("eve.sessionId");
    // Importing eve's container module published the storage on the global slot.
    expect(Reflect.get(globalThis, Symbol.for("eve.context-storage"))).toBe(
      contextStorage,
    );

    const container = new ContextContainer();
    container.set(SessionIdKey, "ses-real-eve");

    const { calls, fetch } = captureFetch();
    const wrapped = eveSessionFetch(undefined, fetch);
    await contextStorage.run(container, () =>
      wrapped("https://api.example.com/v4/ai", { method: "POST" }),
    );
    expect(headerOf(onlyCall(calls), EVE_SESSION_HEADER)).toBe("ses-real-eve");
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
