import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// @zocomputer/runtime-auth — the agent-token contract shared by the minter and the verifier.
//
// `apps/api` mints the agent token (and verifies it), the launcher that starts an
// agent process mints one too (dev), and `@zocomputer/agent-sandbox` carries it on the
// header. Putting the format in one package keeps those in lockstep — the claims,
// the header names, and the reserved Builder identity all have a single source of
// truth, rather than `apps/api` owning the format and everyone else re-deriving it.
//
// The crypto is pure and injectable (secret + clock passed in) so it unit-tests
// without env. `apps/api` is the sole verifier; a runtime carries the token but
// never holds the signing secret. See plans/rc2/runtime-auth-context.md.

// ── headers ──────────────────────────────────────────────────────────────────

/** The agent token, kept off `Authorization` so it never shadows a WorkOS session. */
export const AGENT_TOKEN_HEADER = "x-zo-agent-token";

/**
 * The eve session the agent's call is for — carried onto the context as `eveSessionId`.
 * Semantically the session the call BILLS TO: a subagent child session (runtime-internal,
 * no conversation row) stamps its ROOT session's id here, so the session-owner join
 * lands on the root's conversation; the child's own id rides
 * {@link EVE_SUBAGENT_SESSION_HEADER} as descriptive detail.
 */
export const EVE_SESSION_HEADER = "x-zo-eve-session";

/**
 * The eve turn the agent's call belongs to. Descriptive metering detail (it lands
 * in `UsageEvent.metadata.turnId`, never attribution/ownership): a model step's
 * usage row is turn-linkable via its generation id against eve's stored steps,
 * but a Zo-paid tool's own gateway call is invisible to eve's step machinery —
 * this header is what pins a `tool_use` row to its exact turn.
 */
export const EVE_TURN_HEADER = "x-zo-eve-turn";

/**
 * The subagent child session a call actually ran in, when the billing session
 * (`EVE_SESSION_HEADER`) is the root of a dispatch chain. Descriptive metering detail
 * exactly like the turn header (it lands in `UsageEvent.metadata.subagentSessionId`,
 * never attribution/ownership, never joined) — it keeps per-child spend queryable
 * while the row's `eveSessionId` column carries the root.
 */
export const EVE_SUBAGENT_SESSION_HEADER = "x-zo-eve-subagent-session";

/** The database-backed Builder writer lease validated by the Builder proxy. */
export const BUILDER_TURN_LEASE_HEADER = "x-zo-builder-lease";

/** The accepted hosted turn allowed to settle its Conversation row. */
export const HOSTED_TURN_LEASE_HEADER = "x-zo-turn-lease";
/** HTTP/database bound shared by the proxy, settle route, and clients. */
export const MAX_HOSTED_TURN_LEASE_ID_LENGTH = 128;

export function isHostedTurnLeaseId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_HOSTED_TURN_LEASE_ID_LENGTH &&
    /^\S+$/u.test(value)
  );
}

/** Env var a runtime reads its agent token from (injected by its launcher). */
export const AGENT_TOKEN_ENV = "ZO_AGENT_TOKEN";

// ── actor + context ──────────────────────────────────────────────────────────

/** A running eve agent acting as itself. */
export interface AgentActor {
  readonly kind: "agent";
  /** Which agent (the durable product object). */
  readonly agentProjectId: string;
  /** The org that owns the agent — always present. */
  readonly ownerOrgId: string;
  /** The running deployment, once hosted deploys mint one. */
  readonly deploymentId?: string;
}

/** A human calling the API directly (browser/native), no agent in between. */
export interface UserActor {
  readonly kind: "user";
  readonly userId: string;
  readonly orgId: string;
}

/** The resolved identity for a request. */
export interface RuntimeAuthContext {
  readonly actor: AgentActor | UserActor;
  /**
   * The eve session this call is acting for, when an agent actor reports one — the
   * join key from which a route resolves the `Conversation` (and through it the
   * user, org, installation). Carried per request on `EVE_SESSION_HEADER`, not a
   * token claim and not verified (self-asserted, scoped by the actor's org, the same
   * trust the sandbox route gives its eve session key). Absent on a direct user call.
   */
  readonly eveSessionId?: string;
}

// ── reserved identities ──────────────────────────────────────────────────────

/**
 * The reserved Zo platform org. Zo's own first-party usage (the Builder, internal
 * jobs) is scoped to it. A real `Org` row, seeded at DB setup, so anything written
 * against it (a `SandboxResource`, later usage rows) satisfies the foreign key. Its
 * id is a fixed, well-known string (not a minted TypeID) so it can be referenced as
 * a constant from both the minter and the seed.
 */
export const ZO_PLATFORM_ORG = {
  id: "org_zo",
  name: "Zo",
  slug: "zo",
} as const;

/**
 * The Builder's hardcoded agent identity. The Builder is Zo's own first-party agent
 * (it edits other agents) — not a customer-built one — so it has no `AgentProject`
 * row and a fixed identity instead: a well-known project id and the platform org as
 * owner. `agentProjectId` is never persisted by the sandbox path (only `ownerOrgId`
 * is, against the FK), so it needs no seeded row of its own.
 */
export const BUILDER_AGENT_IDENTITY: AgentTokenClaims = {
  agentProjectId: "agt_builder",
  ownerOrgId: ZO_PLATFORM_ORG.id,
};

/**
 * The dev BUILT agent's hardcoded identity (the `apps/local-agent` working copy
 * on :2000, launched by `packages/fixtures`). Like the Builder it's a first-party
 * dev process with no `AgentProject` row — a fixed identity scoped to the platform
 * org, so its gateway calls are attributed (and metered) instead of anonymous.
 * Which USER's session a call belongs to still comes from the session join, never
 * this token.
 */
export const LOCAL_AGENT_IDENTITY: AgentTokenClaims = {
  agentProjectId: "agt_local",
  ownerOrgId: ZO_PLATFORM_ORG.id,
};

/**
 * Reserved first-party project ids that deliberately have NO `AgentProject` row
 * (#81: no fake product rows) — consumers must never write them into an
 * AgentProject foreign key. One list so a new reserved identity can't be missed
 * at one of the call sites.
 */
export const RESERVED_AGENT_PROJECT_IDS: readonly string[] = [
  BUILDER_AGENT_IDENTITY.agentProjectId,
  LOCAL_AGENT_IDENTITY.agentProjectId,
];

// ── token wire shapes ────────────────────────────────────────────────────────

const ISSUER = "zo-api";
const AGENT_TOKEN_TYP = "zo-agent";

/** What the agent token asserts about the actor. */
export interface AgentTokenClaims {
  readonly agentProjectId: string;
  readonly ownerOrgId: string;
  readonly deploymentId?: string;
}

/** Seconds-since-epoch clock, injected so tests are deterministic. */
export type Clock = () => number;

const defaultClock: Clock = () => Math.floor(Date.now() / 1000);

/** Encode the HMAC secret string for jose's Web Crypto key input. */
function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

// ── mint ─────────────────────────────────────────────────────────────────────

export interface MintAgentTokenInput {
  readonly claims: AgentTokenClaims;
  readonly secret: string;
  /** Token lifetime in seconds. */
  readonly ttlSeconds: number;
  readonly clock?: Clock;
}

/** Mint the agent token (the actor credential injected into a runtime's env). */
export async function mintAgentToken(input: MintAgentTokenInput): Promise<string> {
  const now = (input.clock ?? defaultClock)();
  const payload: JWTPayload = {
    typ: AGENT_TOKEN_TYP,
    agentProjectId: input.claims.agentProjectId,
    ownerOrgId: input.claims.ownerOrgId,
    ...(input.claims.deploymentId ? { deploymentId: input.claims.deploymentId } : {}),
  };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(now + input.ttlSeconds)
    .sign(key(input.secret));
}

// ── verify ───────────────────────────────────────────────────────────────────

/** Verify the agent token's signature, issuer, expiry, and `typ`. Returns the claims,
 * or `null` when the token is invalid/expired/wrong-typ. */
export async function verifyAgentToken(
  token: string,
  secret: string,
  clock: Clock = defaultClock,
): Promise<AgentTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      issuer: ISSUER,
      currentDate: new Date(clock() * 1000),
    });
    if (payload.typ !== AGENT_TOKEN_TYP) return null;
    const agentProjectId = asString(payload.agentProjectId);
    const ownerOrgId = asString(payload.ownerOrgId);
    if (!agentProjectId || !ownerOrgId) return null;
    const deploymentId = asString(payload.deploymentId);
    return { agentProjectId, ownerOrgId, ...(deploymentId ? { deploymentId } : {}) };
  } catch {
    return null;
  }
}

/**
 * Resolve a verified agent token into a `RuntimeAuthContext`, or `null` when the
 * token is invalid. `eveSessionId` is the session the runtime reports for this call
 * (per request — see the field doc); it's carried onto the context so consumers can
 * join to the `Conversation`. It's not part of the token and is not verified here.
 */
export async function resolveAgentContext(
  agentToken: string,
  secret: string,
  eveSessionId: string | undefined,
  clock: Clock = defaultClock,
): Promise<RuntimeAuthContext | null> {
  const claims = await verifyAgentToken(agentToken, secret, clock);
  if (!claims) return null;
  return {
    actor: {
      kind: "agent",
      agentProjectId: claims.agentProjectId,
      ownerOrgId: claims.ownerOrgId,
      ...(claims.deploymentId ? { deploymentId: claims.deploymentId } : {}),
    },
    ...(eveSessionId ? { eveSessionId } : {}),
  };
}

// ── identity bearer ──────────────────────────────────────────────────────────
//
// The second first-party token (credential A): a short-lived signed identity the
// browser carries on the Builder's eve traffic (`@zocomputer/auth-core`'s
// IDENTITY_BEARER_HEADER) asserting "this user is building this agent". Needed
// because eve's client fetch sends no credentials, so the builder eve-proxy can't
// see the WorkOS session cookie — the browser trades its cookie for this bearer
// over an authenticated `POST /agents/:id/builder/identity-token`, and the proxy
// verifies it offline, then injects the resolved identity as the plaintext
// `x-zo-initiator` header (credential B, below). apps/api both mints and verifies
// (same HMAC secret as the agent token); web only ferries the opaque string. See
// plans/sachin/builder-initiator-binding-implementation.md.

const IDENTITY_BEARER_TYP = "zo-identity";

/** What the identity bearer asserts: which user is building which agent. */
export interface IdentityClaims {
  readonly userId: string;
  readonly agentId: string;
}

export interface MintIdentityBearerInput {
  readonly claims: IdentityClaims;
  readonly secret: string;
  /** Bearer lifetime in seconds. */
  readonly ttlSeconds: number;
  readonly clock?: Clock;
}

/** Mint the identity bearer (the browser-side identity credential). */
export async function mintIdentityBearer(
  input: MintIdentityBearerInput,
): Promise<string> {
  const now = (input.clock ?? defaultClock)();
  const payload: JWTPayload = {
    typ: IDENTITY_BEARER_TYP,
    userId: input.claims.userId,
    agentId: input.claims.agentId,
  };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(now + input.ttlSeconds)
    .sign(key(input.secret));
}

/** Verify an identity bearer's signature, issuer, expiry, and `typ`. Returns the
 * claims, or `null` when it's invalid/expired/wrong-typ (incl. an agent token
 * presented where an identity bearer belongs — `typ` keeps them unconfusable). */
export async function verifyIdentityBearer(
  bearer: string,
  secret: string,
  clock: Clock = defaultClock,
): Promise<IdentityClaims | null> {
  try {
    const { payload } = await jwtVerify(bearer, key(secret), {
      issuer: ISSUER,
      currentDate: new Date(clock() * 1000),
    });
    if (payload.typ !== IDENTITY_BEARER_TYP) return null;
    const userId = asString(payload.userId);
    const agentId = asString(payload.agentId);
    if (!userId || !agentId) return null;
    return { userId, agentId };
  } catch {
    return null;
  }
}

// ── initiator header (proxy → Builder) ─────────────────────────────────────────
//
// Credential B: the plaintext identity the builder eve-proxy injects on the
// forwarded request after verifying the identity bearer (credential A). The
// Builder's channel auth reads it and stamps `session.auth.initiator`. Not signed
// — the Builder holds no secret and trusts it because only the edge-authenticated
// proxy can reach it (Deployment Protection). The proxy always strips any
// client-supplied value before setting its own. One JSON header so the identity
// is atomic: `parseInitiator` returns the whole `{ userId, agentId }` or `null`,
// never a half-present pair.

/** The proxy → Builder initiator header. */
export const INITIATOR_HEADER = "x-zo-initiator";

/** The initiator identity carried on `INITIATOR_HEADER`. */
export interface InitiatorIdentity {
  readonly userId: string;
  readonly agentId: string;
}

/** Serialize the initiator identity for `INITIATOR_HEADER`. */
export function formatInitiator(identity: InitiatorIdentity): string {
  return JSON.stringify({ userId: identity.userId, agentId: identity.agentId });
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
