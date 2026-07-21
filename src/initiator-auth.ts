import type { AuthFn } from "eve/channels/auth";

// The Zo channel auth for agents that live behind a Zo identity-injecting
// proxy (apps/api's builder eve-proxy and the tenant runtime router). The
// proxy verifies the browser's signed identity bearer and injects the resolved
// `{ userId, agentId }` as the trusted plaintext `x-zo-initiator` header; this
// AuthFn turns it into the session's durable `initiator` SessionAuthContext.
//
// The agent holds no secret and does NOT verify a signature — it trusts the
// header because only the edge-authenticated proxy can reach it (Vercel
// Deployment Protection; the proxy always strips a client-supplied value). An
// absent/malformed header returns null so a `none()` entry after this one in
// the channel's auth array degrades to anonymous (local dev, where there is no
// proxy to inject it) rather than 401ing.
//
// The header name + JSON shape MIRROR `@zocomputer/runtime-auth`'s
// `INITIATOR_HEADER`/`formatInitiator`/`parseInitiator` (the proxy side of the
// contract) — mirrored, not imported, so this package keeps zero
// `@zocomputer/*` deps (the same stance as `state.ts`'s vocabulary; rib's
// standalone `file:` install can't resolve workspace packages).

/** The proxy → agent initiator header (`@zocomputer/runtime-auth`'s INITIATOR_HEADER). */
export const INITIATOR_HEADER = "x-zo-initiator";
/** The trusted channel's opaque per-session user capability header. */
export const SESSION_CAPABILITY_HEADER = "x-zo-session-capability";
/** Eve auth attribute used to retain the opaque session capability. */
export const SESSION_CAPABILITY_ATTRIBUTE = "zoSessionCapability";

/** The initiator identity carried on `INITIATOR_HEADER`. */
export interface InitiatorIdentity {
  readonly userId: string;
  readonly agentId: string;
}

/** Parse-then-narrow the `INITIATOR_HEADER` value; `null` on absent/malformed. */
export function parseInitiator(value: string | null | undefined): InitiatorIdentity | null {
  if (!value) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { userId, agentId } = parsed as Record<string, unknown>;
  if (typeof userId !== "string" || !userId) return null;
  if (typeof agentId !== "string" || !agentId) return null;
  return { userId, agentId };
}

/** AuthFn that reads `x-zo-initiator` into the session's initiator identity. */
export const initiatorAuth: AuthFn = (request) => {
  const identity = parseInitiator(request.headers.get(INITIATOR_HEADER));
  if (!identity) return null;
  const sessionCapability =
    request.headers.get(SESSION_CAPABILITY_HEADER)?.trim() || null;
  return {
    principalId: identity.userId,
    principalType: "user",
    authenticator: "zo-initiator",
    subject: identity.userId,
    attributes: {
      agentId: identity.agentId,
      ...(sessionCapability === null
        ? {}
        : { [SESSION_CAPABILITY_ATTRIBUTE]: sessionCapability }),
    },
  };
};

/** What a tool/hook reads off `session.auth.initiator` to authorize its work. */
export interface InitiatorReadable {
  readonly attributes?: Readonly<Record<string, string | readonly string[]>>;
  readonly subject?: string;
}

/**
 * Pull `{ userId, agentId }` off a session's `initiator` SessionAuthContext, or
 * `null` when it's absent (local dev, unscoped session) or malformed —
 * `agentId` from `attributes.agentId`, `userId` from `subject` (matching
 * `initiatorAuth` above).
 */
export function readInitiator(
  initiator: InitiatorReadable | null | undefined,
): InitiatorIdentity | null {
  if (!initiator) return null;
  const agentId = initiator.attributes?.agentId;
  const userId = initiator.subject;
  if (typeof agentId !== "string" || !agentId) return null;
  if (typeof userId !== "string" || !userId) return null;
  return { userId, agentId };
}

/** Read the trusted channel capability, preferring fresh auth over the initiator. */
export function readSessionCapability(
  current: InitiatorReadable | null | undefined,
  initiator: InitiatorReadable | null | undefined,
): string | undefined {
  return capabilityFromAuth(current) ?? capabilityFromAuth(initiator);
}

function capabilityFromAuth(
  value: InitiatorReadable | null | undefined,
): string | undefined {
  const capability = value?.attributes?.[SESSION_CAPABILITY_ATTRIBUTE];
  return typeof capability === "string" && capability.trim().length > 0
    ? capability
    : undefined;
}

// ── Vercel OIDC caller-subject gate (shared by the channel owners) ────────────
//
// A hosted channel trusts `x-zo-initiator` ONLY when the (already
// signature-verified) caller is Zo's API — its OIDC token's `sub` matches a
// configured API subject. eve's `verifyVercelOidc` ALSO accepts the agent's OWN
// project token (the always-on current-project bypass) for internal/subagent
// calls; those must NOT be able to assert a user initiator, or a tenant could
// forge one with its own project's token. This gate is the security-critical
// decision, factored here so the tenant seed and Builder channel share ONE
// tested implementation instead of diverging copies. Pure (no `eve` import).

/** Parse the comma-separated `ZO_API_OIDC_SUBJECTS` env into trimmed matchers. */
export function parseApiSubjects(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** IAM-style `*`-wildcard match of a Vercel `sub` against a subject pattern. */
function subjectMatches(sub: string, pattern: string): boolean {
  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}$`).test(sub);
}

/** The `sub` claim of an already-signature-verified JWT; `null` on malformed. */
function verifiedTokenSubject(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const payload: unknown = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    if (typeof payload !== "object" || payload === null) return null;
    const sub = (payload as Record<string, unknown>).sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}

/**
 * Whether an already-verified `token`'s `sub` matches one of the configured API
 * `subjects` — i.e. the caller is Zo's API, not the agent's own current-project
 * bypass token. The channel owner calls this AFTER `verifyVercelOidc` succeeds,
 * and only trusts `x-zo-initiator` when it returns `true`.
 */
export function isVerifiedApiCaller(
  token: string,
  subjects: readonly string[],
): boolean {
  const sub = verifiedTokenSubject(token);
  return sub !== null && subjects.some((s) => subjectMatches(sub, s));
}
