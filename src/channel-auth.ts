import {
  type AuthFn,
  extractBearerToken,
  localDev,
  none,
  verifyVercelOidc,
} from "eve/channels/auth";
import {
  INITIATOR_HEADER,
  initiatorAuth,
  isVerifiedApiCaller,
  parseApiSubjects,
  parseInitiator,
  SESSION_CAPABILITY_ATTRIBUTE,
  SESSION_CAPABILITY_HEADER,
} from "./initiator-auth";

// The eve-channel auth composition for a Zo-hosted agent. Split from the
// sibling `initiator-auth.ts` — which stays free of eve's RUNTIME graph
// (`import type` only) so the pure header/subject helpers can be imported
// without pulling eve in — because verifying a caller needs eve's real
// `verifyVercelOidc`/`extractBearerToken`.

/**
 * Build an `AuthFn` that verifies the caller is Zo's API over Vercel OIDC
 * before trusting the `x-zo-initiator` header it injects.
 *
 * eve's `verifyVercelOidc` also accepts the agent's OWN project token (the
 * always-on current-project bypass) for internal and subagent calls. Those
 * authenticate as a service principal but must NOT be able to assert a user
 * initiator — otherwise a tenant could forge any initiator with their own
 * project's OIDC token. So the injected header is honored only when the token's
 * `sub` additionally matches a configured API subject.
 *
 * Returns `null` when the caller is unverified, so the channel's auth walk falls
 * through to the next entry (and ultimately 401) rather than accepting anonymously.
 *
 * @param subjects - Vercel OIDC `sub` patterns identifying Zo's API project,
 * as parsed by {@link parseApiSubjects}. Supports `*` wildcards.
 * @returns An `AuthFn` for a channel's `auth` array.
 */
export function verifiedInitiatorAuth(subjects: readonly string[]): AuthFn {
  return async (request) => {
    const token = extractBearerToken(request.headers.get("authorization"));
    const result = await verifyVercelOidc(token, { subjects: [...subjects] });
    if (!result.ok) return null;
    const identity =
      token && isVerifiedApiCaller(token, subjects)
        ? parseInitiator(request.headers.get(INITIATOR_HEADER))
        : null;
    if (!identity) return result.sessionAuth;
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
}

/**
 * The complete channel auth walk for a Zo-hosted agent, selected by whether the
 * caller-identity subjects are configured.
 *
 * With subjects present, the caller must verify as Zo's API
 * ({@link verifiedInitiatorAuth}) and `localDev()` covers loopback `eve dev`;
 * there is no anonymous entry, so a deployed request without a verified caller
 * exhausts the walk with 401.
 *
 * With no subjects — an agent deployed before Zo's API injects them — it falls
 * back to the pre-OIDC behavior so the agent keeps working through the migration.
 *
 * @param subjects - Raw comma-separated subject list. Defaults to the
 * `ZO_API_OIDC_SUBJECTS` environment variable, which Zo's API injects at deploy time.
 * @returns The `AuthFn` array to pass as a channel's `auth`.
 */
export function zoChannelAuth(subjects?: string): readonly AuthFn[] {
  const parsed = parseApiSubjects(subjects ?? process.env.ZO_API_OIDC_SUBJECTS);
  return parsed.length > 0
    ? [verifiedInitiatorAuth(parsed), localDev()]
    : [initiatorAuth, none()];
}
