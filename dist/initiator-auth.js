// ../../../../../tmp/agent-sdk-mirror-XpkfuE/repo/src/initiator-auth.ts
var INITIATOR_HEADER = "x-zo-initiator";
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
  return {
    principalId: identity.userId,
    principalType: "user",
    authenticator: "zo-initiator",
    subject: identity.userId,
    attributes: { agentId: identity.agentId }
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
export {
  readInitiator,
  parseInitiator,
  initiatorAuth,
  INITIATOR_HEADER
};
