// ../../../../../tmp/agent-sdk-mirror-maQjFV/repo/src/steer.ts
var STEER_FIELD = "user_steer";
var STEER_WRAPPED_OUTPUT_FIELD = "steer_wrapped_output";
var STEER_DIRNAME = "steer";
var STEER_NOTE = "The user sent these messages while this tool was running. They take priority: address them now and adjust your current approach before continuing.";
function buildSteerPayload(messages) {
  return { note: STEER_NOTE, messages: [...messages] };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSteerMessage(value) {
  return isRecord(value) && typeof value.id === "string" && typeof value.text === "string" && typeof value.at === "number";
}
function attachSteerToOutput(output, messages) {
  if (isRecord(output)) {
    const existing = readSteerMessages(output) ?? [];
    return { ...output, [STEER_FIELD]: buildSteerPayload([...existing, ...messages]) };
  }
  return {
    [STEER_WRAPPED_OUTPUT_FIELD]: output,
    [STEER_FIELD]: buildSteerPayload(messages)
  };
}
function stripSteerFromOutput(record) {
  const { [STEER_FIELD]: _steer, ...rest } = record;
  const keys = Object.keys(rest);
  if (keys.length === 1 && keys[0] === STEER_WRAPPED_OUTPUT_FIELD) {
    return rest[STEER_WRAPPED_OUTPUT_FIELD];
  }
  return rest;
}
function readSteerMessages(output) {
  if (!isRecord(output))
    return null;
  const payload = output[STEER_FIELD];
  if (!isRecord(payload) || !Array.isArray(payload.messages))
    return null;
  const messages = payload.messages.filter(isSteerMessage);
  return messages.length > 0 ? messages : null;
}
function formatSteerText(messages) {
  const lines = messages.map((message) => `- ${message.text}`);
  return `[${STEER_FIELD}] ${STEER_NOTE}
${lines.join(`
`)}`;
}
function mergeSteerIntoModelOutput(output, messages) {
  if (output.type === "text") {
    return { type: "text", value: `${output.value}

${formatSteerText(messages)}` };
  }
  return { type: "json", value: attachSteerToOutput(output.value, messages) };
}
function serializeSteerLine(message) {
  return JSON.stringify(message);
}
function parseSteerLine(line) {
  const trimmed = line.trim();
  if (trimmed === "")
    return null;
  try {
    const parsed = JSON.parse(trimmed);
    return isSteerMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
export {
  stripSteerFromOutput,
  serializeSteerLine,
  readSteerMessages,
  parseSteerLine,
  mergeSteerIntoModelOutput,
  formatSteerText,
  buildSteerPayload,
  attachSteerToOutput,
  STEER_WRAPPED_OUTPUT_FIELD,
  STEER_NOTE,
  STEER_FIELD,
  STEER_DIRNAME
};
