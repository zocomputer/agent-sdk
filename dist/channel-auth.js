// ../../../../../tmp/agent-sdk-mirror-8osWcm/repo/src/channel-auth.ts
import {
  extractBearerToken,
  localDev,
  none,
  verifyVercelOidc
} from "eve/channels/auth";

// ../../../../../tmp/agent-sdk-mirror-8osWcm/repo/src/initiator-auth.ts
var INITIATOR_HEADER = "x-zo-initiator";
var SESSION_CAPABILITY_HEADER = "x-zo-session-capability";
var SESSION_CAPABILITY_ATTRIBUTE = "zoSessionCapability";
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
var initiatorAuth = (request) => {
  const identity = parseInitiator(request.headers.get(INITIATOR_HEADER));
  if (!identity)
    return null;
  const sessionCapability = request.headers.get(SESSION_CAPABILITY_HEADER)?.trim() || null;
  return {
    principalId: identity.userId,
    principalType: "user",
    authenticator: "zo-initiator",
    subject: identity.userId,
    attributes: {
      agentId: identity.agentId,
      ...sessionCapability === null ? {} : { [SESSION_CAPABILITY_ATTRIBUTE]: sessionCapability }
    }
  };
};
function parseApiSubjects(raw) {
  if (!raw)
    return [];
  return raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}
function subjectMatches(sub, pattern) {
  const escaped = pattern.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp(`^${escaped}$`).test(sub);
}
function verifiedTokenSubject(token) {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1])
    return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (typeof payload !== "object" || payload === null)
      return null;
    const sub = payload.sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}
function isVerifiedApiCaller(token, subjects) {
  const sub = verifiedTokenSubject(token);
  return sub !== null && subjects.some((s) => subjectMatches(sub, s));
}

// ../../../../../tmp/agent-sdk-mirror-8osWcm/repo/src/channel-auth.ts
function verifiedInitiatorAuth(subjects) {
  return async (request) => {
    const token = extractBearerToken(request.headers.get("authorization"));
    const result = await verifyVercelOidc(token, { subjects: [...subjects] });
    if (!result.ok)
      return null;
    const identity = token && isVerifiedApiCaller(token, subjects) ? parseInitiator(request.headers.get(INITIATOR_HEADER)) : null;
    if (!identity)
      return result.sessionAuth;
    const sessionCapability = request.headers.get(SESSION_CAPABILITY_HEADER)?.trim() || null;
    return {
      principalId: identity.userId,
      principalType: "user",
      authenticator: "zo-initiator",
      subject: identity.userId,
      attributes: {
        agentId: identity.agentId,
        ...sessionCapability === null ? {} : { [SESSION_CAPABILITY_ATTRIBUTE]: sessionCapability }
      }
    };
  };
}
function zoChannelAuth(subjects) {
  const parsed = parseApiSubjects(subjects ?? process.env.ZO_API_OIDC_SUBJECTS);
  return parsed.length > 0 ? [verifiedInitiatorAuth(parsed), localDev()] : [initiatorAuth, none()];
}
export {
  zoChannelAuth,
  verifiedInitiatorAuth
};
