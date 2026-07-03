import {
  AGENT_TOKEN_ENV,
  AGENT_TOKEN_HEADER,
  EVE_SESSION_HEADER,
} from "../runtime-auth/index.ts";
import type { SshSandboxAccess } from "./ssh-session";

// The runtime's thin HTTP client to the control plane (apps/api). The runtime
// has no Daytona key; it asks the API to provision/reattach its session's
// sandbox and hand back scoped SSH access. This is the runtime→control-plane
// call the platform plan describes — the API owns the privileged credential.
//
// The runtime authenticates this call with its **agent token** — a short-lived,
// apps/api-minted JWT identifying the actor, injected into the runtime's env (the
// same way the AI gateway key is). It rides a dedicated header (off `Authorization`,
// so it never shadows a WorkOS session). It also reports the eve session on its own
// header, so apps/api carries it onto the resolved auth context (the join key to the
// conversation), not just into the /sandbox/session body. The header names + env var
// come from `@zocomputer/runtime-auth` (the one source of truth for the token contract).
// apps/api is the sole verifier; the runtime only carries the token.
// See plans/rc2/runtime-auth-context.md.

// Re-export the contract constants this client uses, so a consumer importing the
// client surface gets them without reaching into @zocomputer/runtime-auth directly.
export { AGENT_TOKEN_ENV, AGENT_TOKEN_HEADER, EVE_SESSION_HEADER };

/** The slice of `fetch` we use — narrower than `typeof fetch` so a test can stub it. */
export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

/** What the API's POST /sandbox/session returns — scoped SSH access + expiry. */
export type SandboxSessionResponse = SshSandboxAccess;

/**
 * Parse-then-narrow the API's JSON response rather than asserting it inward: the
 * parsed value is fed straight into the SSH connect path (host/user), so a
 * shape-divergent body (a 200 error envelope, a renamed field) must fail here at
 * the boundary, not flow in as a bad host/username. Returns `null` on mismatch.
 */
export function parseSandboxAccess(value: unknown): SandboxSessionResponse | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const { sandboxId, sshHost, sshUser, expiresAt } = v;
  if (
    typeof sandboxId === "string" &&
    typeof sshHost === "string" &&
    typeof sshUser === "string" &&
    typeof expiresAt === "string"
  ) {
    return { sandboxId, sshHost, sshUser, expiresAt };
  }
  return null;
}

export interface RequestSandboxInput {
  /** Base URL of the control-plane API (e.g. http://api.zo.localhost:4000). */
  readonly apiBaseUrl: string;
  /**
   * Stable per-eve-session key. The API keys this session's sandbox off it (+
   * the caller's org), so a reply reattaches the same sandbox — the runtime
   * doesn't send a sandbox id, the API is authoritative on which one.
   */
  readonly eveSessionKey: string;
  /**
   * The agent token to authenticate with. Injectable for tests; defaults to
   * `process.env[AGENT_TOKEN_ENV]`. When absent the call is sent without the
   * header (the API rejects it once `/sandbox/session` requires an auth context;
   * harmless while that route still accepts a session).
   */
  readonly agentToken?: string;
  /** Injectable for tests; defaults to global fetch. */
  readonly fetch?: FetchLike;
}

/**
 * Ask the control plane for this session's sandbox + scoped SSH access. The API
 * looks up this session's recorded sandbox (org + eve session key) and reattaches
 * it when alive, else creates a fresh sandbox, records the SandboxResource, and
 * mints a short-lived SSH token.
 */
export async function requestSandboxAccess(
  input: RequestSandboxInput,
): Promise<SandboxSessionResponse> {
  const doFetch = input.fetch ?? fetch;
  // Treat a blank/whitespace token as absent (don't send the header) — apps/api trims
  // and ignores a blank agent-token header, so sending one just wastes the agent path
  // and 401s. Send the trimmed token, matching the exact bytes apps/api verifies.
  const agentToken = (input.agentToken ?? process.env[AGENT_TOKEN_ENV])?.trim() || undefined;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (agentToken) headers[AGENT_TOKEN_HEADER] = agentToken;
  headers[EVE_SESSION_HEADER] = input.eveSessionKey;
  const res = await doFetch(`${input.apiBaseUrl}/sandbox/session`, {
    method: "POST",
    headers,
    body: JSON.stringify({ eveSessionKey: input.eveSessionKey }),
  });
  if (!res.ok) {
    throw new Error(
      `sandbox provisioning failed: ${res.status} ${await res.text().catch(() => "")}`.trim(),
    );
  }
  const parsed = parseSandboxAccess(await res.json().catch(() => null));
  if (parsed === null) {
    throw new Error("sandbox provisioning returned an unexpected response shape");
  }
  return parsed;
}
