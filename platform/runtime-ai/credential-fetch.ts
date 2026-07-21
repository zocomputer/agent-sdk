// Attaches the runtime's request-time credential to every gateway call.
//
// The identity headers must be resolved PER REQUEST, not once at
// `createGateway` construction: a warm hosted function serves invocations whose
// Vercel OIDC token differs between calls, so a token captured into the static
// `headers` record would go stale. The custom `fetch` option is the per-request
// seam (same reason `session-fetch.ts` stamps the session id here).
//
// Self-contained by the same rule as `session-fetch.ts` / `gateway.ts`: this
// package is vendored source-only into the agent working copy, so it mirrors
// `@zocomputer/runtime-auth`'s credential contract (header names + the
// context/env readers) rather than importing it. The canonical, unit-tested
// source of this logic is `@zocomputer/runtime-auth`'s `runtime-credential.ts`;
// keep the two in lockstep.

/** Mirrors `@zocomputer/runtime-auth`'s `VERCEL_OIDC_HEADER`. */
export const VERCEL_OIDC_HEADER = "x-zo-vercel-oidc";
/** Mirrors `@zocomputer/runtime-auth`'s `VERCEL_DEPLOYMENT_HINT_HEADER`. */
export const VERCEL_DEPLOYMENT_HINT_HEADER = "x-zo-vercel-deployment-id";
/** Mirrors `@zocomputer/runtime-auth`'s `LOCAL_AGENT_HEADER`. */
export const LOCAL_AGENT_HEADER = "x-zo-local-agent";
/** Mirrors `@zocomputer/runtime-auth`'s legacy `AGENT_TOKEN_HEADER` (migration only). */
export const AGENT_TOKEN_HEADER = "x-zo-agent-token";

type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit = Parameters<typeof globalThis.fetch>[1];

/**
 * The headers of the live Vercel invocation context, or `null` when there is no
 * context. Read structurally off the request-context symbol so no `@vercel/*`
 * dependency is needed; never throws (a shape change degrades to `null`).
 * PRESENCE (not the token) is the hosted-vs-sandbox discriminator: a hosted
 * function always has a context, a control-plane sandbox never does.
 */
function invocationContextHeaders(): Record<string, unknown> | null {
  const holder = (globalThis as Record<symbol, unknown>)[
    Symbol.for("@vercel/request-context")
  ];
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

/** The trimmed OIDC token from context headers; blank/absent → `undefined`. */
function oidcTokenFromHeaders(
  headers: Record<string, unknown>,
): string | undefined {
  const token = headers["x-vercel-oidc-token"];
  // Trim + treat blank as absent (the auth-header trim rule): a whitespace-only
  // token must NOT win precedence and ship a useless blank header.
  if (typeof token !== "string") return undefined;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function trimmedEnv(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

/** Every credential header — cleared before the one chosen credential is set. */
const ALL_CREDENTIAL_HEADERS = [
  VERCEL_OIDC_HEADER,
  VERCEL_DEPLOYMENT_HINT_HEADER,
  LOCAL_AGENT_HEADER,
  AGENT_TOKEN_HEADER,
];

/**
 * The single credential for the current request. Exactly ONE is chosen (the
 * API rejects a request carrying more than one runtime credential), by
 * precedence: a live invocation OIDC token (hosted) → a sandbox-injected
 * `VERCEL_OIDC_TOKEN` (used only when there is NO invocation context, so a
 * hosted function's stale build-time copy is ignored) → the legacy
 * `ZO_AGENT_TOKEN` HMAC (migration; removed once every runtime is on OIDC) →
 * a reserved local agent id. `{}` when nothing is present, so the API rejects
 * the anonymous call.
 *
 * Ordering rationale: OIDC first so a mid-migration hosted agent (which still
 * has `ZO_AGENT_TOKEN` baked in AND a live OIDC context) presents only OIDC. The
 * legacy HMAC is ABOVE the local-agent id because the API accepts HMAC today but
 * does NOT yet authenticate `x-zo-local-agent` (that lands with the Phase-3
 * server support) — so a working HMAC credential must never be suppressed by a
 * not-yet-honored local id.
 *
 * The sandbox `VERCEL_OIDC_TOKEN` is used ONLY when there is NO invocation
 * context — a hosted function's build-time copy of that env is stale, so when a
 * context exists but carries no token we fall through to HMAC rather than ship
 * the stale env value (which would 401 a working mid-migration caller).
 *
 * OIDC is presented ONLY when `ZO_RUNTIME_OIDC` is set — the deploy/sandbox
 * injects it exactly when the API it targets has `OIDC_TRUST` configured. This
 * decouples the CLIENT rollout from the SERVER's readiness: an agent that picks
 * up this transport before its API trusts OIDC keeps using its working
 * `ZO_AGENT_TOKEN` instead of sending an OIDC token the API would 401.
 */
export function runtimeCredentialHeaders(): Record<string, string> {
  if (trimmedEnv("ZO_RUNTIME_OIDC") !== undefined) {
    const contextHeaders = invocationContextHeaders();
    if (contextHeaders) {
      const invocation = oidcTokenFromHeaders(contextHeaders);
      if (invocation) return oidcHeaders(invocation);
      // Context present but no token: DON'T read the stale build-time env; fall
      // through to the legacy credential.
    } else {
      const sandbox = trimmedEnv("VERCEL_OIDC_TOKEN");
      if (sandbox) return oidcHeaders(sandbox);
    }
  }

  const legacy = trimmedEnv("ZO_AGENT_TOKEN");
  if (legacy) return { [AGENT_TOKEN_HEADER]: legacy };

  const local = trimmedEnv("ZO_LOCAL_AGENT_ID");
  if (local) return { [LOCAL_AGENT_HEADER]: local };

  return {};
}

function oidcHeaders(token: string): Record<string, string> {
  const hint = trimmedEnv("VERCEL_DEPLOYMENT_ID");
  return {
    [VERCEL_OIDC_HEADER]: token,
    ...(hint ? { [VERCEL_DEPLOYMENT_HINT_HEADER]: hint } : {}),
  };
}

/**
 * Wrap a fetch so every call carries EXACTLY the current runtime credential.
 * The ambient runtime identity is authoritative: any caller-supplied credential
 * header is cleared before the chosen one is set, so a stale/legacy header on
 * `init` can't ride ALONGSIDE the ambient credential (the API rejects a request
 * carrying more than one). Unlike the session stamp, this applies to EVERY call
 * — auth identity rides whether or not an eve session is in scope.
 */
export function credentialFetch(
  baseFetch: typeof globalThis.fetch = globalThis.fetch,
): typeof globalThis.fetch {
  return Object.assign((input: FetchInput, init?: FetchInit) => {
    const credential = runtimeCredentialHeaders();
    if (Object.keys(credential).length === 0) return baseFetch(input, init);
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    // Exactly one credential rides: drop any caller-supplied credential header,
    // then set the single ambient one.
    for (const name of ALL_CREDENTIAL_HEADERS) headers.delete(name);
    for (const [name, value] of Object.entries(credential)) {
      headers.set(name, value);
    }
    return baseFetch(input, { ...init, headers });
  }, baseFetch);
}
