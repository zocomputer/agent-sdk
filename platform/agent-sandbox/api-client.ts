import {
  AGENT_TOKEN_ENV,
  AGENT_TOKEN_HEADER,
  EVE_SESSION_HEADER,
} from "../runtime-auth/index.ts";
import type { SshSandboxAccess } from "./ssh-session";

// The runtime's thin HTTP client to the control plane (apps/api) STATE BROKER.
// The runtime has no Daytona key; it asks the broker to resolve its session's
// `scratch` sandbox state (POST /state/handles) and hand back scoped SSH access,
// then connects over SSH. The org-wide Daytona key lives only in apps/api.
//
// This is design-doc D10: the default per-session runtime sandbox is now the
// `scratch` external-state declaration, resolved through the SAME broker every
// other state uses — there is no bespoke POST /sandbox/session route anymore.
// The broker zero-configs an unbound `scratch` declaration onto the sandbox
// engine, so we send `suggestedDefaults.engine = "sandbox-daytona"` to keep it
// off the broker's R2 default; a user rebinding `scratch` (e.g. to a durable
// `user` partition) takes precedence over these hints. See
// plans/dcosson/external-state-sandbox.md.
//
// Auth: the runtime carries its **agent token** — a short-lived, apps/api-minted
// JWT identifying the actor, injected into the runtime env (`ZO_AGENT_TOKEN`) the
// same way the AI gateway key is. It rides a dedicated header (off `Authorization`,
// so it never shadows a WorkOS session), and the eve session rides its own header
// so apps/api carries it onto the resolved auth context. The header names + env
// var come from `@zocomputer/runtime-auth` (the one source of truth). apps/api is
// the sole verifier. POST /state/handles is AGENT-TOKEN-ONLY: it rejects a human
// session with 403 `unsupported_actor`, so every caller must present an agent token.
// See plans/rc2/runtime-auth-context.md and plans/dcosson/external-state-sandbox.md.

// Re-export the contract constants this client uses, so a consumer importing the
// client surface gets them without reaching into @zocomputer/runtime-auth directly.
export { AGENT_TOKEN_ENV, AGENT_TOKEN_HEADER, EVE_SESSION_HEADER };

/** The seed `scratch` declaration the default runtime sandbox resolves through. */
export const SCRATCH_DECLARATION = "scratch";

/** The broker path the runtime resolves its sandbox state handle through. */
const STATE_HANDLE_PATH = "/state/handles";

/** The slice of `fetch` we use — narrower than `typeof fetch` so a test can stub it. */
export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

/** The scoped SSH access the broker's sandbox state handle carries — host/user + expiry. */
export type SandboxSessionResponse = SshSandboxAccess;

/**
 * A typed broker failure. `code` is the broker's error-taxonomy string (e.g.
 * `unsupported_actor`, `eve_session_required`, `provisioning_failed`); `status`
 * the HTTP status. Callers can branch on `code` rather than parse the message.
 */
export class SandboxBrokerError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, options: { status: number; code?: string | null }) {
    super(message);
    this.name = "SandboxBrokerError";
    this.status = options.status;
    this.code = options.code ?? null;
  }
}

/**
 * The trust-consent attribution the broker returns on a `consent_required` 409 —
 * a structural mirror of the canonical envelope
 * (`packages/agent-sdk/src/state-consent-envelope.ts`). Parsed structurally (no
 * `zod` — agent-sandbox has none), matching this file's other boundary parsers.
 */
export interface SandboxConsentEnvelope {
  readonly bindingId: string;
  readonly declarationName: string;
  readonly resourceName: string;
  readonly party: { readonly handle: string; readonly external: boolean; readonly intentDivergenceNote?: string };
}

/**
 * A `consent_required` gate on the scratch sandbox handle (bead zo-oxg.27.10),
 * carrying the trust envelope. Subclasses `SandboxBrokerError` so every existing
 * catcher still handles it; a consent-aware caller can branch on the subclass.
 *
 * DEFENSE-IN-DEPTH — currently UNREACHABLE. The `scratch` declaration is
 * `intent: "private", partition: "session"`, so it zero-configs to an *active*
 * binding and never reaches `pending_consent`; the broker never returns
 * `consent_required` for it today. This branch is insurance for when `scratch`
 * becomes rebindable to a *shared* partition: a caller resolving the handle
 * inside a model turn can then turn this typed error into a `request_state_consent`
 * steer, exactly as `@zocomputer/cloud-tools` does for the files path. Because the
 * sandbox is resolved by `zoBackend` at session boot (not inside a model tool
 * call), there is no model turn to steer here yet — so we carry the envelope, not
 * a steer string.
 */
export class SandboxConsentRequiredError extends SandboxBrokerError {
  readonly consent: SandboxConsentEnvelope;

  constructor(consent: SandboxConsentEnvelope, options: { status: number }) {
    super(
      `sandbox access needs the user's consent for "${consent.resourceName}" (consent_required); the binding is awaiting approval.`,
      { status: options.status, code: "consent_required" },
    );
    this.name = "SandboxConsentRequiredError";
    this.consent = consent;
  }
}

/** Structurally parse the consent envelope off a `consent_required` 409 body, or `null` if malformed. */
export function parseSandboxConsentEnvelope(value: unknown): SandboxConsentEnvelope | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const { bindingId, declarationName, resourceName, party } = v;
  if (
    typeof bindingId !== "string" || bindingId.length === 0 ||
    typeof declarationName !== "string" || declarationName.length === 0 ||
    typeof resourceName !== "string" || resourceName.length === 0 ||
    typeof party !== "object" || party === null
  ) {
    return null;
  }
  const p = party as Record<string, unknown>;
  if (typeof p.handle !== "string" || p.handle.length === 0 || typeof p.external !== "boolean") return null;
  return {
    bindingId,
    declarationName,
    resourceName,
    party: {
      handle: p.handle,
      external: p.external,
      ...(typeof p.intentDivergenceNote === "string" && p.intentDivergenceNote.length > 0
        ? { intentDivergenceNote: p.intentDivergenceNote }
        : {}),
    },
  };
}

/**
 * Parse-then-narrow the scoped SSH access, rather than asserting it inward: the
 * parsed value is fed straight into the SSH connect path (host/user), so a
 * shape-divergent value (a renamed field, a null) must fail here at the boundary,
 * not flow in as a bad host/username. Returns `null` on mismatch.
 */
export function parseSandboxAccess(value: unknown): SshSandboxAccess | null {
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

/**
 * Extract scoped SSH access from a broker state-handle response. The sandbox
 * engine's handle nests access under `sandbox`; a non-sandbox handle (e.g. an
 * R2 `files` handle, which the broker returns if `scratch` ever resolved onto
 * the R2 default engine) has no sandbox access and fails here at the boundary,
 * rather than flowing in as a missing host. Returns `null` on mismatch.
 */
export function parseSandboxHandleAccess(value: unknown): SshSandboxAccess | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.engine !== "sandbox-daytona") return null;
  return parseSandboxAccess(v.sandbox);
}

export interface RequestSandboxInput {
  /** Base URL of the control-plane API (e.g. http://api.zo.localhost:4000). */
  readonly apiBaseUrl: string;
  /**
   * Stable per-eve-session key. Sent as the `x-zo-eve-session` header; the broker
   * keys the session-partitioned `scratch` instance off it (+ the caller's org),
   * so a reply reattaches the same sandbox.
   */
  readonly eveSessionKey: string;
  /**
   * The agent token to authenticate with. Injectable for tests; defaults to
   * `process.env[AGENT_TOKEN_ENV]`. When absent the call is sent without the
   * header, and the broker rejects it with 403 `unsupported_actor` (the route is
   * agent-token-only) — a clear failure rather than a silent fallthrough.
   */
  readonly agentToken?: string;
  /** Injectable for tests; defaults to global fetch. */
  readonly fetch?: FetchLike;
}

/**
 * Resolve this session's `scratch` sandbox through the state broker and return
 * scoped SSH access. The broker recovers the subject from the agent token +
 * eve-session header, resolves (or zero-configs) the `scratch` binding onto the
 * sandbox engine, and mints a short-lived SSH token for the session's sandbox —
 * creating it, reattaching a live one, or reviving a stopped one as needed.
 *
 * Throws `SandboxBrokerError` on any non-2xx, carrying the broker's error code
 * (`unsupported_actor`, `eve_session_required`, `provisioning_failed`, …) and
 * HTTP status.
 */
export async function requestScratchSandboxAccess(
  input: RequestSandboxInput,
): Promise<SshSandboxAccess> {
  const doFetch = input.fetch ?? fetch;
  // Treat a blank/whitespace token as absent (don't send the header) — apps/api
  // trims and ignores a blank agent-token header. Send the trimmed token, matching
  // the exact bytes apps/api verifies.
  const agentToken = (input.agentToken ?? process.env[AGENT_TOKEN_ENV])?.trim() || undefined;
  const eveSessionKey = input.eveSessionKey.trim() || undefined;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (agentToken) headers[AGENT_TOKEN_HEADER] = agentToken;
  if (eveSessionKey) headers[EVE_SESSION_HEADER] = eveSessionKey;
  // Header-only eve session — no body `eveSessionKey`, so we never trip the
  // route's header/body mismatch guard (the header IS the trusted session key).
  const res = await doFetch(`${input.apiBaseUrl}${STATE_HANDLE_PATH}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      declarationName: SCRATCH_DECLARATION,
      interface: "exec",
      access: "rw",
      suggestedDefaults: { engine: "sandbox-daytona", partition: "session" },
    }),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const { code, message } = parseBrokerError(json);
    // Defense-in-depth (currently unreachable — see SandboxConsentRequiredError):
    // a consent_required 409 with a parseable envelope surfaces as the typed
    // consent error so a future consent-aware caller can steer, not a swallow.
    if (code === "consent_required") {
      const consent = parseSandboxConsentEnvelope(json);
      if (consent !== null) throw new SandboxConsentRequiredError(consent, { status: res.status });
    }
    throw new SandboxBrokerError(describeBrokerError(res.status, code, message), {
      status: res.status,
      code,
    });
  }
  const access = parseSandboxHandleAccess(json);
  if (access === null) {
    throw new SandboxBrokerError(
      "sandbox broker returned a non-sandbox or malformed state handle",
      { status: res.status, code: "malformed_handle" },
    );
  }
  return access;
}

/** Read the broker's `{ error, message }` failure envelope; both may be absent. */
function parseBrokerError(value: unknown): { code: string | null; message: string | null } {
  if (typeof value !== "object" || value === null) return { code: null, message: null };
  const v = value as Record<string, unknown>;
  return {
    code: typeof v.error === "string" ? v.error : null,
    message: typeof v.message === "string" ? v.message : null,
  };
}

/** Map the broker's error taxonomy to an actionable message for the two flip-novel codes. */
function describeBrokerError(status: number, code: string | null, message: string | null): string {
  if (code === "unsupported_actor") {
    return "sandbox broker rejected the caller: POST /state/handles requires an agent token, not a human session (unsupported_actor). Ensure ZO_AGENT_TOKEN is set.";
  }
  if (code === "eve_session_required") {
    return "sandbox broker requires an eve session: send the x-zo-eve-session header (eve_session_required).";
  }
  const detail = [code, message].filter((s): s is string => s !== null && s.length > 0).join(" — ");
  return `sandbox provisioning failed: ${status}${detail ? ` ${detail}` : ""}`.trim();
}
