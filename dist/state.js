// ../../../../../tmp/agent-sdk-mirror-amKYLe/repo/src/state.ts
var STATE_NAME_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
var INTERFACES = ["files", "sql", "http", "exec"];
var ACCESSES = ["r", "rw"];
var INTENTS = ["private", "shared"];
var PARTITIONS = ["none", "team", "user", "session"];
function defineExternalState(declaration) {
  if (!STATE_NAME_PATTERN.test(declaration.name)) {
    throw new Error(`external-state declaration name "${declaration.name}" must match ${STATE_NAME_PATTERN} and equal the declaring filename`);
  }
  if (!INTERFACES.includes(declaration.interface)) {
    throw new Error(`external-state declaration "${declaration.name}": unknown interface "${String(declaration.interface)}" (expected ${INTERFACES.join(" | ")})`);
  }
  if (!ACCESSES.includes(declaration.access)) {
    throw new Error(`external-state declaration "${declaration.name}": unknown access "${String(declaration.access)}" (expected ${ACCESSES.join(" | ")})`);
  }
  if (!INTENTS.includes(declaration.intent)) {
    throw new Error(`external-state declaration "${declaration.name}": unknown intent "${String(declaration.intent)}" (expected ${INTENTS.join(" | ")})`);
  }
  const partition = declaration.suggestedDefaults?.partition;
  if (partition !== undefined && !PARTITIONS.includes(partition)) {
    throw new Error(`external-state declaration "${declaration.name}": unknown suggested partition "${String(partition)}" (expected ${PARTITIONS.join(" | ")})`);
  }
  return Object.freeze(declaration);
}
export {
  defineExternalState,
  STATE_NAME_PATTERN
};
