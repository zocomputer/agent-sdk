// ../../../../../tmp/agent-sdk-mirror-eO7ydV/repo/platform/runtime-auth/index.ts
import { SignJWT, jwtVerify } from "jose";
var AGENT_TOKEN_HEADER = "x-zo-agent-token";
var EVE_SESSION_HEADER = "x-zo-eve-session";
var EVE_TURN_HEADER = "x-zo-eve-turn";
var EVE_SUBAGENT_SESSION_HEADER = "x-zo-eve-subagent-session";
var BUILDER_TURN_LEASE_HEADER = "x-zo-builder-lease";
var AGENT_TOKEN_ENV = "ZO_AGENT_TOKEN";
var ZO_PLATFORM_ORG = {
  id: "org_zo",
  name: "Zo",
  slug: "zo"
};
var BUILDER_AGENT_IDENTITY = {
  agentProjectId: "agt_builder",
  ownerOrgId: ZO_PLATFORM_ORG.id
};
var LOCAL_AGENT_IDENTITY = {
  agentProjectId: "agt_local",
  ownerOrgId: ZO_PLATFORM_ORG.id
};
var RESERVED_AGENT_PROJECT_IDS = [
  BUILDER_AGENT_IDENTITY.agentProjectId,
  LOCAL_AGENT_IDENTITY.agentProjectId
];
var ISSUER = "zo-api";
var AGENT_TOKEN_TYP = "zo-agent";
var defaultClock = () => Math.floor(Date.now() / 1000);
function key(secret) {
  return new TextEncoder().encode(secret);
}
function asString(v) {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
async function mintAgentToken(input) {
  const now = (input.clock ?? defaultClock)();
  const payload = {
    typ: AGENT_TOKEN_TYP,
    agentProjectId: input.claims.agentProjectId,
    ownerOrgId: input.claims.ownerOrgId,
    ...input.claims.deploymentId ? { deploymentId: input.claims.deploymentId } : {}
  };
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuer(ISSUER).setIssuedAt(now).setExpirationTime(now + input.ttlSeconds).sign(key(input.secret));
}
async function verifyAgentToken(token, secret, clock = defaultClock) {
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      issuer: ISSUER,
      currentDate: new Date(clock() * 1000)
    });
    if (payload.typ !== AGENT_TOKEN_TYP)
      return null;
    const agentProjectId = asString(payload.agentProjectId);
    const ownerOrgId = asString(payload.ownerOrgId);
    if (!agentProjectId || !ownerOrgId)
      return null;
    const deploymentId = asString(payload.deploymentId);
    return { agentProjectId, ownerOrgId, ...deploymentId ? { deploymentId } : {} };
  } catch {
    return null;
  }
}
async function resolveAgentContext(agentToken, secret, eveSessionId, clock = defaultClock) {
  const claims = await verifyAgentToken(agentToken, secret, clock);
  if (!claims)
    return null;
  return {
    actor: {
      kind: "agent",
      agentProjectId: claims.agentProjectId,
      ownerOrgId: claims.ownerOrgId,
      ...claims.deploymentId ? { deploymentId: claims.deploymentId } : {}
    },
    ...eveSessionId ? { eveSessionId } : {}
  };
}
var IDENTITY_BEARER_TYP = "zo-identity";
async function mintIdentityBearer(input) {
  const now = (input.clock ?? defaultClock)();
  const payload = {
    typ: IDENTITY_BEARER_TYP,
    userId: input.claims.userId,
    agentId: input.claims.agentId
  };
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuer(ISSUER).setIssuedAt(now).setExpirationTime(now + input.ttlSeconds).sign(key(input.secret));
}
async function verifyIdentityBearer(bearer, secret, clock = defaultClock) {
  try {
    const { payload } = await jwtVerify(bearer, key(secret), {
      issuer: ISSUER,
      currentDate: new Date(clock() * 1000)
    });
    if (payload.typ !== IDENTITY_BEARER_TYP)
      return null;
    const userId = asString(payload.userId);
    const agentId = asString(payload.agentId);
    if (!userId || !agentId)
      return null;
    return { userId, agentId };
  } catch {
    return null;
  }
}
var INITIATOR_HEADER = "x-zo-initiator";
function formatInitiator(identity) {
  return JSON.stringify({ userId: identity.userId, agentId: identity.agentId });
}
function parseInitiator(value) {
  if (!value)
    return null;
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null)
    return null;
  const { userId, agentId } = parsed;
  if (typeof userId !== "string" || !userId)
    return null;
  if (typeof agentId !== "string" || !agentId)
    return null;
  return { userId, agentId };
}
export {
  verifyIdentityBearer,
  verifyAgentToken,
  resolveAgentContext,
  parseInitiator,
  mintIdentityBearer,
  mintAgentToken,
  formatInitiator,
  ZO_PLATFORM_ORG,
  RESERVED_AGENT_PROJECT_IDS,
  LOCAL_AGENT_IDENTITY,
  INITIATOR_HEADER,
  EVE_TURN_HEADER,
  EVE_SUBAGENT_SESSION_HEADER,
  EVE_SESSION_HEADER,
  BUILDER_TURN_LEASE_HEADER,
  BUILDER_AGENT_IDENTITY,
  AGENT_TOKEN_HEADER,
  AGENT_TOKEN_ENV
};
