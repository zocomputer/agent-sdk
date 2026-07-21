// ../../../../../tmp/agent-sdk-mirror-8osWcm/repo/platform/runtime-auth/index.ts
import { SignJWT, errors as joseErrors, jwtVerify } from "jose";

// ../../../../../tmp/agent-sdk-mirror-8osWcm/repo/platform/runtime-auth/runtime-credential.ts
var VERCEL_OIDC_HEADER = "x-zo-vercel-oidc";
var VERCEL_DEPLOYMENT_HINT_HEADER = "x-zo-vercel-deployment-id";
var LOCAL_AGENT_HEADER = "x-zo-local-agent";
var LOCAL_AGENT_ENV = "ZO_LOCAL_AGENT_ID";
var AGENT_TOKEN_HEADER = "x-zo-agent-token";
function resolveRuntimeCredential(env) {
  if (env.readOidcEnabled()) {
    const invocation = env.readInvocationOidcToken()?.trim();
    if (invocation) {
      return oidcCredential(invocation, env, "request-context");
    }
    const sandbox = env.readSandboxOidcToken()?.trim();
    if (sandbox) {
      return oidcCredential(sandbox, env, "sandbox-env");
    }
  }
  const legacy = env.readLegacyAgentToken()?.trim();
  if (legacy) {
    return { kind: "legacy-agent-token", token: legacy };
  }
  const local = env.readLocalAgentId()?.trim();
  if (local) {
    return { kind: "local-agent", agentProjectId: local };
  }
  return {
    kind: "unavailable",
    reason: "no runtime credential: no OIDC token, HMAC token, or local agent id"
  };
}
function oidcCredential(token, env, source) {
  const hint = env.readDeploymentId()?.trim();
  return {
    kind: "vercel-oidc",
    token,
    source,
    ...hint ? { deploymentHint: hint } : {}
  };
}
function credentialHeaders(credential) {
  switch (credential.kind) {
    case "vercel-oidc":
      return {
        [VERCEL_OIDC_HEADER]: credential.token,
        ...credential.deploymentHint ? { [VERCEL_DEPLOYMENT_HINT_HEADER]: credential.deploymentHint } : {}
      };
    case "legacy-agent-token":
      return { [AGENT_TOKEN_HEADER]: credential.token };
    case "local-agent":
      return { [LOCAL_AGENT_HEADER]: credential.agentProjectId };
    case "unavailable":
      return {};
  }
}
function invocationContextHeaders() {
  const holder = globalThis[Symbol.for("@vercel/request-context")];
  if (typeof holder !== "object" || holder === null)
    return null;
  const get = holder.get;
  if (typeof get !== "function")
    return null;
  let ctx;
  try {
    ctx = get.call(holder);
  } catch {
    return null;
  }
  if (typeof ctx !== "object" || ctx === null)
    return null;
  const headers = ctx.headers;
  if (typeof headers !== "object" || headers === null)
    return null;
  return headers;
}
function readInvocationOidcTokenFromContext() {
  const headers = invocationContextHeaders();
  if (headers === null)
    return;
  const token = headers["x-vercel-oidc-token"];
  if (typeof token !== "string")
    return;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
function defaultCredentialEnv() {
  return {
    readInvocationOidcToken: readInvocationOidcTokenFromContext,
    readSandboxOidcToken() {
      if (invocationContextHeaders() !== null)
        return;
      return trimmedEnv("VERCEL_OIDC_TOKEN");
    },
    readDeploymentId() {
      return trimmedEnv("VERCEL_DEPLOYMENT_ID");
    },
    readLocalAgentId() {
      return trimmedEnv(LOCAL_AGENT_ENV);
    },
    readOidcEnabled() {
      return trimmedEnv("ZO_RUNTIME_OIDC") !== undefined;
    },
    readLegacyAgentToken() {
      return trimmedEnv("ZO_AGENT_TOKEN");
    }
  };
}
function trimmedEnv(name) {
  const v = process.env[name];
  if (typeof v !== "string")
    return;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
function currentRuntimeCredential() {
  return resolveRuntimeCredential(defaultCredentialEnv());
}
function currentInvocationOidcToken() {
  return readInvocationOidcTokenFromContext();
}

// ../../../../../tmp/agent-sdk-mirror-8osWcm/repo/platform/runtime-auth/index.ts
var AGENT_TOKEN_HEADER2 = "x-zo-agent-token";
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
function bindTrustedSession(claims, actor, eveSessionId) {
  if (claims.agentProjectId !== actor.agentProjectId || claims.deploymentId !== actor.deploymentId || eveSessionId === undefined || claims.eveSessionId !== undefined && claims.eveSessionId !== eveSessionId) {
    return null;
  }
  return claims.eveSessionId === undefined ? {
    binding: "bootstrap",
    unverifiedEveSessionId: eveSessionId,
    userId: claims.userId
  } : { binding: "exact", eveSessionId, userId: claims.userId };
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
      const bound = bindTrustedSession(verification.claims, claims, eveSessionId);
      if (bound === null)
        return null;
      trustedSession = bound;
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
  resolveRuntimeCredential,
  resolveAgentContext,
  parseInitiator,
  mintSessionCapability,
  mintIdentityBearer,
  mintAgentToken,
  isHostedTurnLeaseId,
  inspectSessionCapability,
  formatInitiator,
  defaultCredentialEnv,
  currentRuntimeCredential,
  currentInvocationOidcToken,
  credentialHeaders,
  bindTrustedSession,
  ZO_PLATFORM_ORG,
  VERCEL_OIDC_HEADER,
  VERCEL_DEPLOYMENT_HINT_HEADER,
  SESSION_CAPABILITY_HEADER,
  SESSION_CAPABILITY_ATTRIBUTE,
  RESERVED_AGENT_PROJECT_IDS,
  MAX_HOSTED_TURN_LEASE_ID_LENGTH,
  LOCAL_AGENT_IDENTITY,
  LOCAL_AGENT_HEADER,
  LOCAL_AGENT_ENV,
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
  AGENT_TOKEN_HEADER2 as AGENT_TOKEN_HEADER,
  AGENT_TOKEN_ENV
};
