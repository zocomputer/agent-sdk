import { afterEach, describe, expect, test } from "bun:test";
import {
  type CredentialEnv,
  credentialHeaders,
  currentRuntimeCredential,
  LOCAL_AGENT_HEADER,
  resolveRuntimeCredential,
  VERCEL_DEPLOYMENT_HINT_HEADER,
  VERCEL_OIDC_HEADER,
} from "./runtime-credential";

interface EnvOverrides {
  readInvocationOidcToken?: string;
  readSandboxOidcToken?: string;
  readDeploymentId?: string;
  readLocalAgentId?: string;
  readLegacyAgentToken?: string;
  /** OIDC gate; defaults to ON so existing OIDC cases don't all need to opt in. */
  readOidcEnabled?: boolean;
}

function envOf(over: EnvOverrides): CredentialEnv {
  return {
    readInvocationOidcToken: () => over.readInvocationOidcToken,
    readSandboxOidcToken: () => over.readSandboxOidcToken,
    readDeploymentId: () => over.readDeploymentId,
    readLocalAgentId: () => over.readLocalAgentId,
    readLegacyAgentToken: () => over.readLegacyAgentToken,
    readOidcEnabled: () => over.readOidcEnabled ?? true,
  };
}

const CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");

describe("resolveRuntimeCredential", () => {
  test("prefers the live invocation token (hosted), tagging the source", () => {
    const cred = resolveRuntimeCredential(
      envOf({ readInvocationOidcToken: "tok_ctx", readSandboxOidcToken: "tok_env" }),
    );
    expect(cred).toEqual({
      kind: "vercel-oidc",
      token: "tok_ctx",
      source: "request-context",
    });
  });

  test("attaches a deployment hint when present", () => {
    const cred = resolveRuntimeCredential(
      envOf({ readInvocationOidcToken: "tok", readDeploymentId: "dpl_1" }),
    );
    expect(cred).toEqual({
      kind: "vercel-oidc",
      token: "tok",
      source: "request-context",
      deploymentHint: "dpl_1",
    });
  });

  test("falls to the sandbox-injected token when there is no invocation context", () => {
    const cred = resolveRuntimeCredential(
      envOf({ readSandboxOidcToken: "tok_env" }),
    );
    expect(cred).toEqual({
      kind: "vercel-oidc",
      token: "tok_env",
      source: "sandbox-env",
    });
  });

  test("falls to a local agent id when no OIDC token is present", () => {
    const cred = resolveRuntimeCredential(
      envOf({ readLocalAgentId: "agt_local" }),
    );
    expect(cred).toEqual({ kind: "local-agent", agentProjectId: "agt_local" });
  });

  test("OIDC beats a local agent id when both are present", () => {
    const cred = resolveRuntimeCredential(
      envOf({ readInvocationOidcToken: "tok", readLocalAgentId: "agt_local" }),
    );
    expect(cred.kind).toBe("vercel-oidc");
  });

  test("unavailable when nothing is present (fail before the request)", () => {
    const cred = resolveRuntimeCredential(envOf({}));
    expect(cred.kind).toBe("unavailable");
  });

  test("legacy HMAC when no OIDC token", () => {
    const cred = resolveRuntimeCredential(envOf({ readLegacyAgentToken: "hmac" }));
    expect(cred).toEqual({ kind: "legacy-agent-token", token: "hmac" });
  });

  test("legacy HMAC outranks the local id (server-supported today)", () => {
    const cred = resolveRuntimeCredential(
      envOf({ readLegacyAgentToken: "hmac", readLocalAgentId: "agt_local" }),
    );
    expect(cred).toEqual({ kind: "legacy-agent-token", token: "hmac" });
  });

  test("gate OFF: a live OIDC token is ignored, working HMAC wins", () => {
    const cred = resolveRuntimeCredential(
      envOf({
        readOidcEnabled: false,
        readInvocationOidcToken: "tok",
        readLegacyAgentToken: "hmac",
      }),
    );
    expect(cred).toEqual({ kind: "legacy-agent-token", token: "hmac" });
  });

  test("treats blank/whitespace values as absent", () => {
    const cred = resolveRuntimeCredential(
      envOf({ readInvocationOidcToken: "   ", readSandboxOidcToken: "  ", readLocalAgentId: " " }),
    );
    expect(cred.kind).toBe("unavailable");
  });
});

describe("defaultCredentialEnv invocation reader", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, CONTEXT_SYMBOL);
    Reflect.deleteProperty(process.env, "VERCEL_OIDC_TOKEN");
    Reflect.deleteProperty(process.env, "ZO_RUNTIME_OIDC");
  });

  test("a context WITHOUT a token ignores the stale build-time env (presence-gated)", () => {
    // A hosted function always has a context; its env VERCEL_OIDC_TOKEN is the
    // stale build-time copy. When the context carries no token, the sandbox env
    // must NOT be used — the resolver falls through (here: unavailable), so a
    // real transport falls to the working legacy credential instead.
    process.env.ZO_RUNTIME_OIDC = "1";
    (globalThis as Record<symbol, unknown>)[CONTEXT_SYMBOL] = {
      get: () => ({ headers: { "x-vercel-oidc-token": "   " } }),
    };
    process.env.VERCEL_OIDC_TOKEN = "tok_stale_build";
    expect(currentRuntimeCredential().kind).toBe("unavailable");
  });

  test("no context (OIDC enabled) uses the freshly-injected sandbox env", () => {
    process.env.ZO_RUNTIME_OIDC = "1";
    process.env.VERCEL_OIDC_TOKEN = "tok_sandbox";
    expect(currentRuntimeCredential()).toEqual({
      kind: "vercel-oidc",
      token: "tok_sandbox",
      source: "sandbox-env",
    });
  });

  test("gate OFF: sandbox OIDC env is ignored (unavailable with nothing else)", () => {
    process.env.VERCEL_OIDC_TOKEN = "tok_sandbox";
    expect(currentRuntimeCredential().kind).toBe("unavailable");
  });
});

describe("credentialHeaders", () => {
  test("vercel-oidc → token header, plus deployment hint when set", () => {
    expect(
      credentialHeaders({ kind: "vercel-oidc", token: "tok", source: "request-context" }),
    ).toEqual({ [VERCEL_OIDC_HEADER]: "tok" });
    expect(
      credentialHeaders({
        kind: "vercel-oidc",
        token: "tok",
        source: "request-context",
        deploymentHint: "dpl_1",
      }),
    ).toEqual({ [VERCEL_OIDC_HEADER]: "tok", [VERCEL_DEPLOYMENT_HINT_HEADER]: "dpl_1" });
  });

  test("local-agent → local header", () => {
    expect(credentialHeaders({ kind: "local-agent", agentProjectId: "agt_local" })).toEqual({
      [LOCAL_AGENT_HEADER]: "agt_local",
    });
  });

  test("unavailable → no headers", () => {
    expect(credentialHeaders({ kind: "unavailable", reason: "x" })).toEqual({});
  });
});
