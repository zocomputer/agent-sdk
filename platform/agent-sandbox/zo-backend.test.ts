import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { SandboxBackendCreateInput } from "eve/sandbox";
import {
  AGENT_TOKEN_ENV,
  AGENT_TOKEN_HEADER,
  EVE_SESSION_HEADER,
  SESSION_CAPABILITY_HEADER,
} from "../runtime-auth/index.ts";
import { zoBackend } from "./zo-backend";

// zoBackend composes the real `requestScratchSandboxAccess` (broker client) +
// `sshSandboxSession` (SSH transport). We avoid module mocking (bun's mock.module
// is process-global and would leak into the sibling ssh-session specs) and instead
// drive the REAL backend: `create` is lazy (no I/O until first run), so we assert
// its construction directly, and we prove the broker wiring by stubbing global
// `fetch` to a broker error — the first `run` calls `acquireAccess` (→ the broker)
// BEFORE any SSH connect, so it rejects at the broker with no socket opened. The
// broker request/parse contract itself is covered exhaustively in api-client.test.ts.

// eve hands the backend TWO ids: `sessionKey` is eve's WRAPPED internal key
// (`eve-sbx-ses-…-<sessionId>-__root__`); `tags.sessionId` is the RAW eve session
// id (`wrun_…`). The backend keys the broker off the RAW id (so it matches the
// flush + repo path), and persists the WRAPPED key for eve's own reconnect match.
// These fixtures make the two distinct so a regression that keys on the wrong one
// is caught. `rawSessionId` defaults to the wrapped key ONLY in the fail-loud test,
// which omits tags entirely.
function createInput(
  wrappedSessionKey: string,
  opts: { rawSessionId?: string; existingMetadata?: Record<string, unknown>; omitTags?: boolean } = {},
): SandboxBackendCreateInput {
  return {
    sessionKey: wrappedSessionKey,
    ...(opts.omitTags
      ? {}
      : { tags: { sessionId: opts.rawSessionId ?? "wrun_raw", agent: "builder", channel: "eve" } }),
    ...(opts.existingMetadata === undefined ? {} : { existingMetadata: opts.existingMetadata }),
  } as unknown as SandboxBackendCreateInput;
}

/** A realistic pair: eve's wrapped key vs the raw `wrun_…` it also supplies via tags. */
const WRAPPED_KEY = "eve-sbx-ses-zo-b6f09584-wrun_01KWWB23-__root__";
const RAW_SESSION_ID = "wrun_01KWWB23FSPB6VH77DT9S47BP0";

function header(init: RequestInit | undefined, name: string): string | undefined {
  const h = init?.headers;
  if (!h) return undefined;
  if (h instanceof Headers) return h.get(name) ?? undefined;
  return (h as Record<string, string>)[name];
}

describe("zoBackend", () => {
  const origFetch = globalThis.fetch;
  const origToken = process.env[AGENT_TOKEN_ENV];

  beforeEach(() => {
    process.env[AGENT_TOKEN_ENV] = "agent.jwt.value";
  });
  afterEach(() => {
    globalThis.fetch = origFetch;
    if (origToken === undefined) Reflect.deleteProperty(process.env, AGENT_TOKEN_ENV);
    else process.env[AGENT_TOKEN_ENV] = origToken;
  });

  test("names the eve reconnect backend `zo`", () => {
    expect(zoBackend({ apiBaseUrl: "http://api.test" }).name).toBe("zo");
  });

  test("create returns a working SandboxSession keyed to the eve session, provisioning nothing eagerly", async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls++;
      return new Response("{}", { headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;

    const handle = await zoBackend({
      apiBaseUrl: "http://api.test",
    }).create(
      createInput(WRAPPED_KEY, { rawSessionId: RAW_SESSION_ID }),
    );

    // `SandboxSession.id` is the RAW eve session id, not eve's wrapped key.
    expect(handle.session.id).toBe(RAW_SESSION_ID);
    // The full SandboxSession surface is present (constructed, not a stub).
    expect(typeof handle.session.run).toBe("function");
    expect(typeof handle.session.spawn).toBe("function");
    expect(typeof handle.session.readBinaryFile).toBe("function");
    // Lazy: nothing is provisioned until the first run triggers acquireAccess.
    expect(fetchCalls).toBe(0);
  });

  test("the first run resolves the scratch sandbox through the broker POST /state/handles", async () => {
    const requests: Array<{ url: string; body: unknown; init: RequestInit | undefined }> = [];
    // A broker error short-circuits acquireAccess BEFORE any SSH connect, so the run
    // rejects deterministically with no socket — while we capture the broker request.
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      requests.push({ url, body: JSON.parse(typeof init?.body === "string" ? init.body : "{}"), init });
      return new Response(JSON.stringify({ error: "provider_unconfigured" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const handle = await zoBackend({
      apiBaseUrl: "http://api.test",
      ambientCapability: () => "signed-session-capability",
    }).create(createInput(WRAPPED_KEY, { rawSessionId: RAW_SESSION_ID }));
    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);

    const request = requests[0];
    if (request === undefined) throw new Error("scratch broker request was not captured");
    expect(request.url).toBe("http://api.test/state/handles");
    expect(request.body).toMatchObject({
      declarationName: "scratch",
      interface: "exec",
      access: "rw",
      suggestedDefaults: { engine: "sandbox-daytona", partition: "session" },
    });
    // Agent-token auth (the broker is agent-token-only), eve session on its header.
    expect(header(request.init, AGENT_TOKEN_HEADER)).toBe("agent.jwt.value");
    // The broker partition key is the RAW session id (tags.sessionId) — NOT eve's
    // wrapped `sessionKey`. This is the crux: the flush and the repo path both key
    // on the raw id, so the runtime must too or Save promotes an empty seed tree.
    expect(header(request.init, EVE_SESSION_HEADER)).toBe(RAW_SESSION_ID);
    expect(header(request.init, EVE_SESSION_HEADER)).not.toBe(WRAPPED_KEY);
    expect(header(request.init, SESSION_CAPABILITY_HEADER)).toBe(
      "signed-session-capability",
    );
  });

  test("create fails loud when eve supplies no tags.sessionId (never falls back to the wrapped key)", async () => {
    // A silent fallback to the wrapped key would re-introduce the runtime/flush
    // sandbox split invisibly — so an absent raw id is a hard construction error.
    expect(() =>
      zoBackend({ apiBaseUrl: "http://api.test" }).create(createInput(WRAPPED_KEY, { omitTags: true })),
    ).toThrow(/tags\.sessionId/);
  });

  test("create fails loud on a blank/whitespace tags.sessionId (matching api-client's trim-and-omit)", async () => {
    // `requestScratchSandboxAccess` trims and OMITS a blank `x-zo-eve-session`
    // header, so a whitespace-only id must be rejected HERE with the explicit
    // create-time error, not slip through and fail later at the broker with
    // `eve_session_required`.
    for (const blank of ["", "   ", "\t\n"]) {
      expect(() =>
        zoBackend({ apiBaseUrl: "http://api.test" }).create(createInput(WRAPPED_KEY, { rawSessionId: blank })),
      ).toThrow(/tags\.sessionId/);
    }
  });

  test("captureState falls back to the remembered id before anything is provisioned", async () => {
    const handle = await zoBackend({ apiBaseUrl: "http://api.test" }).create(
      createInput(WRAPPED_KEY, { rawSessionId: RAW_SESSION_ID, existingMetadata: { daytonaSandboxId: "remembered" } }),
    );
    const state = await handle.captureState();
    expect(state).toMatchObject({
      backendName: "zo",
      // eve's reconnect state keys on the WRAPPED key, not the raw broker id.
      sessionKey: WRAPPED_KEY,
      metadata: { daytonaSandboxId: "remembered" },
    });
  });

  test("captureState records an empty id when neither provisioned nor remembered", async () => {
    const handle = await zoBackend({ apiBaseUrl: "http://api.test" }).create(
      createInput(WRAPPED_KEY, { rawSessionId: RAW_SESSION_ID }),
    );
    const state = await handle.captureState();
    expect(state.metadata).toEqual({ daytonaSandboxId: "" });
  });

  test("dispose closes the session and a later run rejects without provisioning", async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls++;
      return new Response("{}");
    }) as unknown as typeof fetch;

    const handle = await zoBackend({ apiBaseUrl: "http://api.test" }).create(
      createInput(WRAPPED_KEY, { rawSessionId: RAW_SESSION_ID }),
    );
    await handle.shutdown();
    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/disposed/);
    // Disposed before any run — the broker was never called.
    expect(fetchCalls).toBe(0);
  });

  // ── Subagent lineage: the broker key becomes the ROOT session's raw id when
  // the current session is a subagent child (ambient `ParentSessionKey` read),
  // else `tags.sessionId` as before. The ambient read is injected (`ambientParent`)
  // so these stay hermetic; ambient.test.ts pins the real read against eve's dist.

  const CHILD_SESSION_ID = "wrun_child_01KWWCHILD";
  const ROOT_SESSION_ID = "wrun_root_01KWWROOT";
  const PARENT = {
    callId: "call_01ABC",
    rootSessionId: ROOT_SESSION_ID,
    sessionId: "wrun_parent_01KWWPARENT",
  };

  /** Stub the broker to a deterministic error, capturing each request's headers. */
  function brokerCapture(): Array<{ init: RequestInit | undefined }> {
    const requests: Array<{ init: RequestInit | undefined }> = [];
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      requests.push({ init });
      return new Response(JSON.stringify({ error: "provider_unconfigured" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
    return requests;
  }

  test("a child session with ambient lineage at create time brokers with the ROOT id", async () => {
    const requests = brokerCapture();
    const handle = await zoBackend({
      apiBaseUrl: "http://api.test",
      ambientParent: () => PARENT,
    }).create(createInput(WRAPPED_KEY, { rawSessionId: CHILD_SESSION_ID }));

    // Create-time resolution → the session label carries the brokered key too.
    expect(handle.session.id).toBe(ROOT_SESSION_ID);
    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);
    const request = requests[0];
    if (request === undefined) throw new Error("scratch broker request was not captured");
    expect(header(request.init, EVE_SESSION_HEADER)).toBe(ROOT_SESSION_ID);
  });

  test("lineage resolving only lazily (inside acquireAccess) still brokers with the ROOT id, and caches it", async () => {
    const requests = brokerCapture();
    // Simulates `create` running OUTSIDE eve's ALS scope: the create-time read
    // misses, the first in-scope read (during the first mint) resolves, and the
    // resolved key is cached — later reads returning null must NOT flip the key
    // back to the child id on a re-mint.
    const ambientReads: Array<typeof PARENT | null> = [null, PARENT, null, null];
    let reads = 0;
    const handle = await zoBackend({
      apiBaseUrl: "http://api.test",
      ambientParent: () => ambientReads[reads++] ?? null,
    }).create(createInput(WRAPPED_KEY, { rawSessionId: CHILD_SESSION_ID }));

    // Create-time read missed → the label (best effort) says the child id.
    expect(handle.session.id).toBe(CHILD_SESSION_ID);

    // Two failed runs → two mints (a broker error leaves no held token), each
    // resolving the broker key: first read hits, second falls back to the cache.
    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);
    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);
    expect(requests.length).toBe(2);
    for (const request of requests) {
      expect(header(request.init, EVE_SESSION_HEADER)).toBe(ROOT_SESSION_ID);
    }

    // The cached lineage key also lands in captureState's diagnostic metadata.
    const state = await handle.captureState();
    expect(state.metadata).toMatchObject({ brokeredSessionKey: ROOT_SESSION_ID });
  });

  test("a lineage read that first resolves AFTER a fallback-keyed mint does not flip the key", async () => {
    const requests = brokerCapture();
    // The hedge case inverted: the FIRST mint misses lineage too (create + mint
    // both out of scope), so the broker is keyed — and may have provisioned —
    // on the child id. A later in-scope read resolving the root must NOT hop
    // the session to a different sandbox mid-run: the first brokered key wins.
    const ambientReads: Array<typeof PARENT | null> = [null, null, PARENT];
    let reads = 0;
    const handle = await zoBackend({
      apiBaseUrl: "http://api.test",
      ambientParent: () => ambientReads[reads++] ?? null,
    }).create(createInput(WRAPPED_KEY, { rawSessionId: CHILD_SESSION_ID }));

    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);
    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);
    expect(requests.length).toBe(2);
    for (const request of requests) {
      expect(header(request.init, EVE_SESSION_HEADER)).toBe(CHILD_SESSION_ID);
    }
    // No lineage key was ever brokered, so the diagnostic metadata omits it.
    const state = await handle.captureState();
    expect(state.metadata).toEqual({ daytonaSandboxId: "" });
  });

  test("ambient lineage absent → falls back to tags.sessionId (a root session is unchanged)", async () => {
    const requests = brokerCapture();
    const handle = await zoBackend({
      apiBaseUrl: "http://api.test",
      ambientParent: () => null,
    }).create(createInput(WRAPPED_KEY, { rawSessionId: RAW_SESSION_ID }));

    expect(handle.session.id).toBe(RAW_SESSION_ID);
    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);
    const request = requests[0];
    if (request === undefined) throw new Error("scratch broker request was not captured");
    expect(header(request.init, EVE_SESSION_HEADER)).toBe(RAW_SESSION_ID);
  });

  test("lineage does not bypass the blank tags.sessionId guard (the fallback must stay honest)", () => {
    // Even a child with resolvable lineage keeps the fail-loud construction
    // error on a blank raw id: the fallback key must never silently be blank.
    expect(() =>
      zoBackend({ apiBaseUrl: "http://api.test", ambientParent: () => PARENT }).create(
        createInput(WRAPPED_KEY, { rawSessionId: "   " }),
      ),
    ).toThrow(/tags\.sessionId/);
  });

  // ── Capability latching: the trusted-channel capability is latched on the
  // FIRST non-undefined ambient read (create time or any mint), mirroring the
  // broker-key latch — a token-expiry re-mint landing outside eve's ALS scope
  // must present the SAME capability the first mint used, not silently drop it
  // (once sandbox state is user-partitioned, a capability-less re-mint would
  // resolve a different partition or fail closed).

  test("a re-mint outside eve's ALS scope still presents the capability latched on the first mint", async () => {
    const requests = brokerCapture();
    // Create runs outside the ALS scope (read misses), the first mint resolves
    // the capability, the second mint's read misses again — the latched value
    // must ride every re-mint regardless.
    const capabilityReads: Array<string | undefined> = [undefined, "signed-session-capability"];
    let reads = 0;
    const handle = await zoBackend({
      apiBaseUrl: "http://api.test",
      ambientCapability: () => capabilityReads[reads++],
    }).create(createInput(WRAPPED_KEY, { rawSessionId: RAW_SESSION_ID }));

    // Two failed runs → two mints (a broker error leaves no held token).
    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);
    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);
    expect(requests.length).toBe(2);
    for (const request of requests) {
      expect(header(request.init, SESSION_CAPABILITY_HEADER)).toBe(
        "signed-session-capability",
      );
    }
  });

  test("a capability latched at create time rides re-mints whose ambient reads all miss", async () => {
    const requests = brokerCapture();
    const capabilityReads: Array<string | undefined> = ["signed-session-capability"];
    let reads = 0;
    const handle = await zoBackend({
      apiBaseUrl: "http://api.test",
      ambientCapability: () => capabilityReads[reads++],
    }).create(createInput(WRAPPED_KEY, { rawSessionId: RAW_SESSION_ID }));

    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);
    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);
    expect(requests.length).toBe(2);
    for (const request of requests) {
      expect(header(request.init, SESSION_CAPABILITY_HEADER)).toBe(
        "signed-session-capability",
      );
    }
  });

  test("no capability ever appearing keeps every mint capability-less (unchanged behavior)", async () => {
    const requests = brokerCapture();
    const handle = await zoBackend({
      apiBaseUrl: "http://api.test",
      ambientCapability: () => undefined,
    }).create(createInput(WRAPPED_KEY, { rawSessionId: RAW_SESSION_ID }));

    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);
    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/provider_unconfigured|503/);
    expect(requests.length).toBe(2);
    for (const request of requests) {
      expect(header(request.init, SESSION_CAPABILITY_HEADER)).toBeUndefined();
    }
  });

  test("captureState keeps eve's WRAPPED sessionKey and records the brokered lineage key as metadata only", async () => {
    const handle = await zoBackend({
      apiBaseUrl: "http://api.test",
      ambientParent: () => PARENT,
    }).create(createInput(WRAPPED_KEY, { rawSessionId: CHILD_SESSION_ID }));
    const state = await handle.captureState();
    // eve's reconnect matching contract: sessionKey stays the wrapped input key.
    expect(state.sessionKey).toBe(WRAPPED_KEY);
    expect(state.metadata).toEqual({
      daytonaSandboxId: "",
      brokeredSessionKey: ROOT_SESSION_ID,
    });
  });

  test("captureState omits brokeredSessionKey when no lineage key was used", async () => {
    const handle = await zoBackend({
      apiBaseUrl: "http://api.test",
      ambientParent: () => null,
    }).create(createInput(WRAPPED_KEY, { rawSessionId: RAW_SESSION_ID }));
    const state = await handle.captureState();
    expect(state.metadata).toEqual({ daytonaSandboxId: "" });
  });

  test("prewarm is a no-op (MVP)", async () => {
    // prewarm ignores its input (MVP no-op); pass an unused placeholder through the
    // double-assertion escape hatch rather than build the full eve prewarm shape.
    const prewarmInput = undefined as unknown as Parameters<ReturnType<typeof zoBackend>["prewarm"]>[0];
    const result = await zoBackend({ apiBaseUrl: "http://api.test" }).prewarm(prewarmInput);
    expect(result).toEqual({ reused: false });
  });
});
