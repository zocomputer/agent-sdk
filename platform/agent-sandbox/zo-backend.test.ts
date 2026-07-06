import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { SandboxBackendCreateInput } from "eve/sandbox";
import { AGENT_TOKEN_ENV, AGENT_TOKEN_HEADER, EVE_SESSION_HEADER } from "../runtime-auth/index.ts";
import { zoBackend } from "./zo-backend";

// zoBackend composes the real `requestScratchSandboxAccess` (broker client) +
// `sshSandboxSession` (SSH transport). We avoid module mocking (bun's mock.module
// is process-global and would leak into the sibling ssh-session specs) and instead
// drive the REAL backend: `create` is lazy (no I/O until first run), so we assert
// its construction directly, and we prove the broker wiring by stubbing global
// `fetch` to a broker error — the first `run` calls `acquireAccess` (→ the broker)
// BEFORE any SSH connect, so it rejects at the broker with no socket opened. The
// broker request/parse contract itself is covered exhaustively in api-client.test.ts.

/** zoBackend only reads `sessionKey` + `existingMetadata`; the rest is unused here. */
function createInput(sessionKey: string, existingMetadata?: Record<string, unknown>): SandboxBackendCreateInput {
  return {
    sessionKey,
    ...(existingMetadata === undefined ? {} : { existingMetadata }),
  } as unknown as SandboxBackendCreateInput;
}

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

    const handle = await zoBackend({ apiBaseUrl: "http://api.test" }).create(createInput("ses-1"));

    expect(handle.session.id).toBe("ses-1");
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

    const handle = await zoBackend({ apiBaseUrl: "http://api.test" }).create(createInput("ses-1"));
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
    expect(header(request.init, EVE_SESSION_HEADER)).toBe("ses-1");
  });

  test("captureState falls back to the remembered id before anything is provisioned", async () => {
    const handle = await zoBackend({ apiBaseUrl: "http://api.test" }).create(
      createInput("ses-1", { daytonaSandboxId: "remembered" }),
    );
    const state = await handle.captureState();
    expect(state).toMatchObject({
      backendName: "zo",
      sessionKey: "ses-1",
      metadata: { daytonaSandboxId: "remembered" },
    });
  });

  test("captureState records an empty id when neither provisioned nor remembered", async () => {
    const handle = await zoBackend({ apiBaseUrl: "http://api.test" }).create(createInput("ses-1"));
    const state = await handle.captureState();
    expect(state.metadata).toEqual({ daytonaSandboxId: "" });
  });

  test("dispose closes the session and a later run rejects without provisioning", async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls++;
      return new Response("{}");
    }) as unknown as typeof fetch;

    const handle = await zoBackend({ apiBaseUrl: "http://api.test" }).create(createInput("ses-1"));
    await handle.dispose();
    await expect(handle.session.run({ command: "echo hi" })).rejects.toThrow(/disposed/);
    // Disposed before any run — the broker was never called.
    expect(fetchCalls).toBe(0);
  });

  test("prewarm is a no-op (MVP)", async () => {
    // prewarm ignores its input (MVP no-op); pass an unused placeholder through the
    // double-assertion escape hatch rather than build the full eve prewarm shape.
    const prewarmInput = undefined as unknown as Parameters<ReturnType<typeof zoBackend>["prewarm"]>[0];
    const result = await zoBackend({ apiBaseUrl: "http://api.test" }).prewarm(prewarmInput);
    expect(result).toEqual({ reused: false });
  });
});
