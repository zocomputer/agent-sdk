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
  return {
    principalId: identity.userId,
    principalType: "user",
    authenticator: "zo-initiator",
    subject: identity.userId,
    attributes: { agentId: identity.agentId },
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
