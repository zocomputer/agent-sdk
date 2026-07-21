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
function readInitiator(initiator) {
  if (!initiator)
    return null;
  const agentId = initiator.attributes?.agentId;
  const userId = initiator.subject;
  if (typeof agentId !== "string" || !agentId)
    return null;
  if (typeof userId !== "string" || !userId)
    return null;
  return { userId, agentId };
}
function readSessionCapability(current, initiator) {
  return capabilityFromAuth(current) ?? capabilityFromAuth(initiator);
}
function capabilityFromAuth(value) {
  const capability = value?.attributes?.[SESSION_CAPABILITY_ATTRIBUTE];
  return typeof capability === "string" && capability.trim().length > 0 ? capability : undefined;
}
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
export {
  readSessionCapability,
  readInitiator,
  parseInitiator,
  parseApiSubjects,
  isVerifiedApiCaller,
  initiatorAuth,
  SESSION_CAPABILITY_HEADER,
  SESSION_CAPABILITY_ATTRIBUTE,
  INITIATOR_HEADER
};
