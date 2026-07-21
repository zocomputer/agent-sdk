import { afterEach, describe, expect, test } from "bun:test";
import { credentialFetch, runtimeCredentialHeaders } from "./credential-fetch";

type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit = Parameters<typeof globalThis.fetch>[1];

const CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");
const ENV_KEYS = [
  "VERCEL_OIDC_TOKEN",
  "VERCEL_DEPLOYMENT_ID",
  "ZO_LOCAL_AGENT_ID",
  "ZO_AGENT_TOKEN",
  "ZO_RUNTIME_OIDC",
] as const;

function clearEnv() {
  for (const k of ENV_KEYS) Reflect.deleteProperty(process.env, k);
}

/** Turn on the OIDC-presentation gate (deploy/sandbox sets this when the API trusts OIDC). */
function enableOidc() {
  process.env.ZO_RUNTIME_OIDC = "1";
}

function setInvocationToken(token: string | undefined) {
  const holder = globalThis as Record<symbol, unknown>;
  if (token === undefined) {
    Reflect.deleteProperty(holder, CONTEXT_SYMBOL);
    return;
  }
  // A hosted OIDC scenario implies the API trusts OIDC → the gate is on.
  enableOidc();
  holder[CONTEXT_SYMBOL] = {
    get: () => ({ headers: { "x-vercel-oidc-token": token } }),
  };
}

afterEach(() => {
  clearEnv();
  setInvocationToken(undefined);
});

describe("runtimeCredentialHeaders", () => {
  test("hosted invocation token wins, plus deployment hint", () => {
    setInvocationToken("tok_ctx");
    process.env.VERCEL_OIDC_TOKEN = "tok_stale_env";
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_1";
    expect(runtimeCredentialHeaders()).toEqual({
      "x-zo-vercel-oidc": "tok_ctx",
      "x-zo-vercel-deployment-id": "dpl_1",
    });
  });

  test("sandbox env token used only when there is no invocation context", () => {
    clearEnv();
    setInvocationToken(undefined);
    enableOidc();
    process.env.VERCEL_OIDC_TOKEN = "tok_sandbox";
    expect(runtimeCredentialHeaders()).toEqual({ "x-zo-vercel-oidc": "tok_sandbox" });
  });

  test("without ZO_RUNTIME_OIDC, a live OIDC token is NOT presented — working HMAC wins", () => {
    // The gate is OFF (no enableOidc). The API this agent targets doesn't trust
    // OIDC yet, so the client must keep using its HMAC token, not 401.
    const holder = globalThis as Record<symbol, unknown>;
    holder[CONTEXT_SYMBOL] = {
      get: () => ({ headers: { "x-vercel-oidc-token": "tok_ctx" } }),
    };
    process.env.ZO_AGENT_TOKEN = "hmac_tok";
    expect(runtimeCredentialHeaders()).toEqual({ "x-zo-agent-token": "hmac_tok" });
  });

  test("local agent id when nothing else is present", () => {
    process.env.ZO_LOCAL_AGENT_ID = "agt_local";
    expect(runtimeCredentialHeaders()).toEqual({ "x-zo-local-agent": "agt_local" });
  });

  test("legacy HMAC when no OIDC token", () => {
    process.env.ZO_AGENT_TOKEN = "hmac_tok";
    expect(runtimeCredentialHeaders()).toEqual({ "x-zo-agent-token": "hmac_tok" });
  });

  test("legacy HMAC outranks the local agent id (HMAC is server-supported today)", () => {
    process.env.ZO_AGENT_TOKEN = "hmac_tok";
    process.env.ZO_LOCAL_AGENT_ID = "agt_local";
    // The API accepts HMAC but not x-zo-local-agent yet, so the working
    // credential must win — never suppressed by a not-yet-honored local id.
    expect(runtimeCredentialHeaders()).toEqual({ "x-zo-agent-token": "hmac_tok" });
  });

  test("exactly one credential — OIDC suppresses the legacy token", () => {
    setInvocationToken("tok_ctx");
    process.env.ZO_AGENT_TOKEN = "hmac_tok";
    const headers = runtimeCredentialHeaders();
    expect(headers).toEqual({ "x-zo-vercel-oidc": "tok_ctx" });
    expect(headers["x-zo-agent-token"]).toBeUndefined();
  });

  test("nothing present → no headers (anonymous, API rejects)", () => {
    expect(runtimeCredentialHeaders()).toEqual({});
  });

  test("a whitespace-only invocation token reads as absent, falling through", () => {
    setInvocationToken("   ");
    process.env.ZO_AGENT_TOKEN = "hmac_tok";
    // The blank invocation token must NOT win and suppress the legacy fallback.
    expect(runtimeCredentialHeaders()).toEqual({ "x-zo-agent-token": "hmac_tok" });
  });

  test("a context without a token ignores the stale env, so working HMAC wins", () => {
    setInvocationToken("   "); // context present, no usable token
    process.env.VERCEL_OIDC_TOKEN = "tok_stale_build"; // stale build-time env
    process.env.ZO_AGENT_TOKEN = "hmac_tok";
    // Presence-gated: a hosted function's stale env must NOT beat the working
    // HMAC — that would 401 a mid-migration gateway call.
    expect(runtimeCredentialHeaders()).toEqual({ "x-zo-agent-token": "hmac_tok" });
  });
});

describe("credentialFetch", () => {
  test("attaches the current credential to each call", async () => {
    setInvocationToken("tok_ctx");
    let seen: Headers | undefined;
    const base = Object.assign((_input: FetchInput, init?: FetchInit) => {
      seen = new Headers(init?.headers);
      return Promise.resolve(new Response("ok"));
    }, globalThis.fetch);

    await credentialFetch(base)("https://api.test/x");
    expect(seen?.get("x-zo-vercel-oidc")).toBe("tok_ctx");
  });

  test("re-reads per call — a changed invocation token rides the next call", async () => {
    const calls: (string | null)[] = [];
    const base = Object.assign((_input: FetchInput, init?: FetchInit) => {
      calls.push(new Headers(init?.headers).get("x-zo-vercel-oidc"));
      return Promise.resolve(new Response("ok"));
    }, globalThis.fetch);
    const wrapped = credentialFetch(base);

    setInvocationToken("tok_a");
    await wrapped("https://api.test/1");
    setInvocationToken("tok_b");
    await wrapped("https://api.test/2");
    expect(calls).toEqual(["tok_a", "tok_b"]);
  });

  test("the ambient credential is authoritative — a caller-supplied one is replaced", async () => {
    setInvocationToken("tok_ctx");
    let seen: Headers | undefined;
    const base = Object.assign((_input: FetchInput, init?: FetchInit) => {
      seen = new Headers(init?.headers);
      return Promise.resolve(new Response("ok"));
    }, globalThis.fetch);

    await credentialFetch(base)("https://api.test/x", {
      headers: { "x-zo-vercel-oidc": "caller_override" },
    });
    expect(seen?.get("x-zo-vercel-oidc")).toBe("tok_ctx");
  });

  test("a caller's stale legacy token is cleared, so only OIDC rides (no dual credential)", async () => {
    setInvocationToken("tok_ctx");
    let seen: Headers | undefined;
    const base = Object.assign((_input: FetchInput, init?: FetchInit) => {
      seen = new Headers(init?.headers);
      return Promise.resolve(new Response("ok"));
    }, globalThis.fetch);

    await credentialFetch(base)("https://api.test/x", {
      headers: { "x-zo-agent-token": "stale_hmac" },
    });
    expect(seen?.get("x-zo-vercel-oidc")).toBe("tok_ctx");
    // The stale legacy header must be gone — the API 401s a dual-credential request.
    expect(seen?.get("x-zo-agent-token")).toBeNull();
  });

  test("no credential → passes through untouched", async () => {
    let called = false;
    const base = Object.assign((_input: FetchInput, _init?: FetchInit) => {
      called = true;
      return Promise.resolve(new Response("ok"));
    }, globalThis.fetch);
    await credentialFetch(base)("https://api.test/x");
    expect(called).toBe(true);
  });
});
