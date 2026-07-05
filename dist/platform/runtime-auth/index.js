// ../../../../../tmp/agent-sdk-mirror-U7xzi8/repo/platform/runtime-auth/index.ts
import { SignJWT, jwtVerify } from "jose";
var AGENT_TOKEN_HEADER = "x-zo-agent-token";
var EVE_SESSION_HEADER = "x-zo-eve-session";
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
    return { agentProjectId, ownerOrgId, deploymentId: asString(payload.deploymentId) };
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
var BUILD_BIND_TYP = "zo-build-bind";
async function mintBuildBindTicket(input) {
  const now = (input.clock ?? defaultClock)();
  const payload = {
    typ: BUILD_BIND_TYP,
    userId: input.claims.userId,
    agentProjectId: input.claims.agentProjectId
  };
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuer(ISSUER).setIssuedAt(now).setExpirationTime(now + input.ttlSeconds).sign(key(input.secret));
}
async function verifyBuildBindTicket(ticket, secret, clock = defaultClock) {
  try {
    const { payload } = await jwtVerify(ticket, key(secret), {
      issuer: ISSUER,
      currentDate: new Date(clock() * 1000)
    });
    if (payload.typ !== BUILD_BIND_TYP)
      return null;
    const userId = asString(payload.userId);
    const agentProjectId = asString(payload.agentProjectId);
    if (!userId || !agentProjectId)
      return null;
    return { userId, agentProjectId };
  } catch {
    return null;
  }
}
export {
  verifyBuildBindTicket,
  verifyAgentToken,
  resolveAgentContext,
  mintBuildBindTicket,
  mintAgentToken,
  ZO_PLATFORM_ORG,
  EVE_SESSION_HEADER,
  BUILDER_AGENT_IDENTITY,
  AGENT_TOKEN_HEADER,
  AGENT_TOKEN_ENV
};
