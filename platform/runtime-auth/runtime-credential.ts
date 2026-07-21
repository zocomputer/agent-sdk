// The request-time runtime credential provider — Phase 2 of the Vercel OIDC
// cutover (plans/rob/vercel-oidc-runtime-auth-plan.md § Runtime credential
// contract).
//
// A runtime caller presents one of three credentials, resolved PER REQUEST (not
// once at client construction — a warm hosted function serves invocations with
// different request-context OIDC tokens, so a token captured at `createGateway`
// time would go stale):
//
//   - `vercel-oidc`  — a hosted function or a control-plane sandbox: the current
//                      Vercel OIDC token, sent on `x-zo-vercel-oidc`.
//   - `local-agent`  — a local dev process (fixtures / local Builder): a reserved
//                      agent id on `x-zo-local-agent`, no token.
//   - `unavailable`  — nothing to present; the caller fails BEFORE the request
//                      rather than forwarding anonymously.
//
// This module is pure + injectable: `resolveRuntimeCredential` takes a
// `CredentialEnv` seam so every branch unit-tests without a Vercel runtime, and
// `defaultCredentialEnv` supplies the real readers. It stays free of
// `@zocomputer/*` deps (the package is vendored self-contained + published).

/** Zo-owned header carrying the current Vercel OIDC token. */
export const VERCEL_OIDC_HEADER = "x-zo-vercel-oidc";
/** Zo-owned header carrying the `VERCEL_DEPLOYMENT_ID` attribution hint. */
export const VERCEL_DEPLOYMENT_HINT_HEADER = "x-zo-vercel-deployment-id";
/** Zo-owned header carrying a reserved local-agent id (dev only). */
export const LOCAL_AGENT_HEADER = "x-zo-local-agent";
/** Env var a local launcher sets to select a reserved local identity. */
export const LOCAL_AGENT_ENV = "ZO_LOCAL_AGENT_ID";
/** Mirrors `AGENT_TOKEN_HEADER` in index.ts (defined here too to avoid an import cycle). */
const AGENT_TOKEN_HEADER = "x-zo-agent-token";

/** The credential a runtime presents for a single outbound API call. */
export type RuntimeCredential =
  | {
      readonly kind: "vercel-oidc";
      readonly token: string;
      readonly deploymentHint?: string;
      /** Which reader produced the token — for one-line non-secret telemetry. */
      readonly source: "request-context" | "sandbox-env";
    }
  | { readonly kind: "legacy-agent-token"; readonly token: string }
  | { readonly kind: "local-agent"; readonly agentProjectId: string }
  | { readonly kind: "unavailable"; readonly reason: string };

/**
 * The injected environment the resolver reads. Kept minimal so tests supply
 * exact values and the resolver has no ambient access.
 */
export interface CredentialEnv {
  /**
   * The current Vercel OIDC token from the live INVOCATION context (hosted
   * functions), or `undefined`. Never a build-time/stale value.
   */
  readInvocationOidcToken(): string | undefined;
  /**
   * A freshly-injected sandbox OIDC token (`VERCEL_OIDC_TOKEN`), used ONLY when
   * there is no Vercel invocation context (a control-plane sandbox has no
   * request context; a hosted function must never read its stale build-time
   * copy of this var). `undefined` on a hosted function.
   */
  readSandboxOidcToken(): string | undefined;
  /** `VERCEL_DEPLOYMENT_ID`, the non-secret attribution hint, or `undefined`. */
  readDeploymentId(): string | undefined;
  /** `ZO_LOCAL_AGENT_ID`, the reserved local identity, or `undefined`. */
  readLocalAgentId(): string | undefined;
  /**
   * Whether this runtime should PRESENT OIDC (`ZO_RUNTIME_OIDC` is set — the
   * deploy/sandbox sets it exactly when the target API trusts OIDC). Gates the
   * OIDC tiers so shipping this transport can't force OIDC on a not-yet-ready API.
   */
  readOidcEnabled(): boolean;
  /** The legacy `ZO_AGENT_TOKEN` HMAC credential (migration), or `undefined`. */
  readLegacyAgentToken(): string | undefined;
}

/**
 * Resolve the one credential to present. Precedence (in lockstep with
 * `@zocomputer/runtime-ai`'s `credential-fetch.ts`): a live invocation token
 * (hosted) → a sandbox-injected token — BOTH only when OIDC is enabled — → the
 * legacy `ZO_AGENT_TOKEN` HMAC → a reserved local id. Nothing present is
 * `unavailable` (fail before the request, never anonymous).
 *
 * OIDC is gated on `readOidcEnabled()` so shipping this transport can't force
 * OIDC onto an agent whose API isn't OIDC-ready. Legacy HMAC outranks the local
 * id because the API accepts HMAC today but not `x-zo-local-agent` (Phase 3).
 */
export function resolveRuntimeCredential(env: CredentialEnv): RuntimeCredential {
  if (env.readOidcEnabled()) {
    const invocation = env.readInvocationOidcToken()?.trim();
    if (invocation) {
      return oidcCredential(invocation, env, "request-context");
    }
    const sandbox = env.readSandboxOidcToken()?.trim();
    if (sandbox) {
      return oidcCredential(sandbox, env, "sandbox-env");
    }
  }
  const legacy = env.readLegacyAgentToken()?.trim();
  if (legacy) {
    return { kind: "legacy-agent-token", token: legacy };
  }
  const local = env.readLocalAgentId()?.trim();
  if (local) {
    return { kind: "local-agent", agentProjectId: local };
  }
  return {
    kind: "unavailable",
    reason: "no runtime credential: no OIDC token, HMAC token, or local agent id",
  };
}

function oidcCredential(
  token: string,
  env: CredentialEnv,
  source: "request-context" | "sandbox-env",
): RuntimeCredential {
  const hint = env.readDeploymentId()?.trim();
  return {
    kind: "vercel-oidc",
    token,
    source,
    ...(hint ? { deploymentHint: hint } : {}),
  };
}

/** The headers a credential contributes to an outbound API request. */
export function credentialHeaders(
  credential: RuntimeCredential,
): Record<string, string> {
  switch (credential.kind) {
    case "vercel-oidc":
      return {
        [VERCEL_OIDC_HEADER]: credential.token,
        ...(credential.deploymentHint
          ? { [VERCEL_DEPLOYMENT_HINT_HEADER]: credential.deploymentHint }
          : {}),
      };
    case "legacy-agent-token":
      return { [AGENT_TOKEN_HEADER]: credential.token };
    case "local-agent":
      return { [LOCAL_AGENT_HEADER]: credential.agentProjectId };
    case "unavailable":
      return {};
  }
}

/**
 * The Vercel invocation-context OIDC token, read from the request-context symbol
 * every hosted Vercel function exposes. This is the CURRENT token for THIS
 * invocation — the value that changes between warm reuses — so it must be read
 * per request, never cached. `undefined` off a Vercel function (a sandbox or
 * local process), which is how {@link defaultCredentialEnv} distinguishes the
 * hosted path from the sandbox path.
 */
/**
 * The headers of the live Vercel invocation context, or `null` when there is no
 * context. Read structurally (no @vercel/* dependency); never throws. PRESENCE
 * (not the token) is the hosted-vs-sandbox discriminator.
 */
function invocationContextHeaders(): Record<string, unknown> | null {
  const holder = (
    globalThis as Record<symbol, unknown>
  )[Symbol.for("@vercel/request-context")];
  if (typeof holder !== "object" || holder === null) return null;
  const get = (holder as { get?: unknown }).get;
  if (typeof get !== "function") return null;
  let ctx: unknown;
  try {
    ctx = get.call(holder);
  } catch {
    return null;
  }
  if (typeof ctx !== "object" || ctx === null) return null;
  const headers = (ctx as { headers?: unknown }).headers;
  if (typeof headers !== "object" || headers === null) return null;
  return headers as Record<string, unknown>;
}

function readInvocationOidcTokenFromContext(): string | undefined {
  const headers = invocationContextHeaders();
  if (headers === null) return undefined;
  const token = headers["x-vercel-oidc-token"];
  if (typeof token !== "string") return undefined;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * The real reader set. The PRESENCE of a Vercel invocation context is the
 * hosted-vs-sandbox discriminator: on a hosted function the invocation reader
 * returns the current token and the sandbox reader returns `undefined` (so the
 * stale build-time `VERCEL_OIDC_TOKEN` is ignored — even when the context
 * carries no token); in a sandbox there is no context, so the freshly-injected
 * `VERCEL_OIDC_TOKEN` is used.
 */
export function defaultCredentialEnv(): CredentialEnv {
  return {
    readInvocationOidcToken: readInvocationOidcTokenFromContext,
    readSandboxOidcToken() {
      // Gate on CONTEXT PRESENCE, not the token: on a hosted function (context
      // present) the stale build-time env is never used, even if the context
      // has no token — the resolver then falls through to the legacy credential.
      if (invocationContextHeaders() !== null) return undefined;
      return trimmedEnv("VERCEL_OIDC_TOKEN");
    },
    readDeploymentId() {
      return trimmedEnv("VERCEL_DEPLOYMENT_ID");
    },
    readLocalAgentId() {
      return trimmedEnv(LOCAL_AGENT_ENV);
    },
    readOidcEnabled() {
      return trimmedEnv("ZO_RUNTIME_OIDC") !== undefined;
    },
    readLegacyAgentToken() {
      return trimmedEnv("ZO_AGENT_TOKEN");
    },
  };
}

/** An env var, trimmed, or `undefined` when unset/blank (the auth trim rule). */
function trimmedEnv(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Resolve the credential from the real environment (per-request convenience). */
export function currentRuntimeCredential(): RuntimeCredential {
  return resolveRuntimeCredential(defaultCredentialEnv());
}

/**
 * The current Vercel invocation OIDC token (hosted), or `undefined`. Use this
 * when a Vercel function acts as a CALLER proving itself to another Vercel
 * project — e.g. `apps/api` calling a hosted agent's eve channel, where it sends
 * this token as `Authorization: Bearer` and the agent verifies it with eve's
 * `vercelOidc({ subjects })`. Read per request (never cached); `undefined` off a
 * Vercel function (local dev), where the agent's `localDev()` gate applies.
 */
export function currentInvocationOidcToken(): string | undefined {
  return readInvocationOidcTokenFromContext();
}
