// ../../../../../tmp/agent-sdk-mirror-vf1nrX/repo/platform/runtime-auth/index.ts
import { SignJWT, errors as joseErrors, jwtVerify } from "jose";
var AGENT_TOKEN_HEADER = "x-zo-agent-token";
var EVE_SESSION_HEADER = "x-zo-eve-session";
var BUILDER_SAVE_TIMEOUT_HEADER = "x-zo-builder-save-timeout-ms";
var BUILDER_SAVE_API_TIMEOUT_MS = 45000;
var BUILDER_FLUSH_TIMEOUT_MS = 50000;
var BUILDER_SAVE_TRANSPORT_TIMEOUT_MS = 60000;
var SESSION_CAPABILITY_HEADER = "x-zo-session-capability";
var SESSION_CAPABILITY_ATTRIBUTE = "zoSessionCapability";
var EVE_TURN_HEADER = "x-zo-eve-turn";
var EVE_SUBAGENT_SESSION_HEADER = "x-zo-eve-subagent-session";
var HOSTED_TURN_LEASE_HEADER = "x-zo-turn-lease";
var MAX_HOSTED_TURN_LEASE_ID_LENGTH = 128;
function isHostedTurnLeaseId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_HOSTED_TURN_LEASE_ID_LENGTH && /^\S+$/u.test(value);
}
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
var SESSION_CAPABILITY_TYP = "zo-session-capability";
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
async function mintSessionCapability(input) {
  const now = (input.clock ?? defaultClock)();
  return new SignJWT({
    typ: SESSION_CAPABILITY_TYP,
    userId: input.claims.userId,
    agentProjectId: input.claims.agentProjectId,
    deploymentId: input.claims.deploymentId,
    ...input.claims.eveSessionId === undefined ? {} : { eveSessionId: input.claims.eveSessionId }
  }).setProtectedHeader({ alg: "HS256" }).setIssuer(ISSUER).setIssuedAt(now).setExpirationTime(now + input.ttlSeconds).sign(key(input.secret));
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
async function inspectSessionCapability(token, secret, clock = defaultClock) {
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      issuer: ISSUER,
      currentDate: new Date(clock() * 1000)
    });
    if (payload.typ !== SESSION_CAPABILITY_TYP)
      return { outcome: "invalid" };
    const userId = asString(payload.userId);
    const agentProjectId = asString(payload.agentProjectId);
    const deploymentId = asString(payload.deploymentId);
    const eveSessionId = payload.eveSessionId === undefined ? undefined : asString(payload.eveSessionId);
    if (!userId || !agentProjectId || !deploymentId || payload.eveSessionId !== undefined && eveSessionId === undefined) {
      return { outcome: "invalid" };
    }
    return {
      outcome: "verified",
      claims: {
        userId,
        agentProjectId,
        deploymentId,
        ...eveSessionId === undefined ? {} : { eveSessionId }
      }
    };
  } catch (cause) {
    if (cause instanceof joseErrors.JWTExpired)
      return { outcome: "expired" };
    return { outcome: "invalid" };
  }
}
async function verifySessionCapability(token, secret, clock = defaultClock) {
  const verification = await inspectSessionCapability(token, secret, clock);
  return verification.outcome === "verified" ? verification.claims : null;
}
async function resolveAgentContext(agentToken, secret, eveSessionId, sessionCapability, clock = defaultClock) {
  const claims = await verifyAgentToken(agentToken, secret, clock);
  if (!claims)
    return null;
  let trustedSession;
  if (sessionCapability !== undefined) {
    const verification = await inspectSessionCapability(sessionCapability, secret, clock);
    if (verification.outcome === "invalid")
      return null;
    if (verification.outcome === "verified") {
      const verified = verification.claims;
      const requestEveSessionId = eveSessionId;
      if (verified.agentProjectId !== claims.agentProjectId || verified.deploymentId !== claims.deploymentId || requestEveSessionId === undefined || verified.eveSessionId !== undefined && verified.eveSessionId !== requestEveSessionId) {
        return null;
      }
      trustedSession = verified.eveSessionId === undefined ? {
        binding: "bootstrap",
        unverifiedEveSessionId: requestEveSessionId,
        userId: verified.userId
      } : {
        binding: "exact",
        eveSessionId: requestEveSessionId,
        userId: verified.userId
      };
    }
  }
  return {
    actor: {
      kind: "agent",
      agentProjectId: claims.agentProjectId,
      ownerOrgId: claims.ownerOrgId,
      ...claims.deploymentId ? { deploymentId: claims.deploymentId } : {}
    },
    ...eveSessionId ? { eveSessionId } : {},
    ...trustedSession === undefined ? {} : { trustedSession }
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
  verifySessionCapability,
  verifyIdentityBearer,
  verifyAgentToken,
  resolveAgentContext,
  parseInitiator,
  mintSessionCapability,
  mintIdentityBearer,
  mintAgentToken,
  isHostedTurnLeaseId,
  inspectSessionCapability,
  formatInitiator,
  ZO_PLATFORM_ORG,
  SESSION_CAPABILITY_HEADER,
  SESSION_CAPABILITY_ATTRIBUTE,
  RESERVED_AGENT_PROJECT_IDS,
  MAX_HOSTED_TURN_LEASE_ID_LENGTH,
  LOCAL_AGENT_IDENTITY,
  INITIATOR_HEADER,
  HOSTED_TURN_LEASE_HEADER,
  EVE_TURN_HEADER,
  EVE_SUBAGENT_SESSION_HEADER,
  EVE_SESSION_HEADER,
  BUILDER_SAVE_TRANSPORT_TIMEOUT_MS,
  BUILDER_SAVE_TIMEOUT_HEADER,
  BUILDER_SAVE_API_TIMEOUT_MS,
  BUILDER_FLUSH_TIMEOUT_MS,
  BUILDER_AGENT_IDENTITY,
  AGENT_TOKEN_HEADER,
  AGENT_TOKEN_ENV
};
