// ../../../../../tmp/agent-sdk-mirror-7vgVJe/repo/platform/runtime-ai/session-fetch.ts
var EVE_SESSION_HEADER = "x-zo-eve-session";
var EVE_CONTEXT_STORAGE_KEY = Symbol.for("eve.context-storage");
var SESSION_ID_KEY_NAME = "eve.sessionId";
function hasMethod(value, name) {
  return typeof value === "object" && value !== null && typeof value[name] === "function";
}
function ambientEveSessionId() {
  const storage = Reflect.get(globalThis, EVE_CONTEXT_STORAGE_KEY);
  if (!hasMethod(storage, "getStore"))
    return;
  const store = storage.getStore();
  if (!hasMethod(store, "get"))
    return;
  const value = store.get({ name: SESSION_ID_KEY_NAME });
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
function eveSessionFetch(getSessionId = ambientEveSessionId, baseFetch = globalThis.fetch) {
  return Object.assign((input, init) => {
    const sessionId = getSessionId()?.trim();
    if (!sessionId)
      return baseFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set(EVE_SESSION_HEADER, sessionId);
    return baseFetch(input, { ...init, headers });
  }, baseFetch);
}
export {
  eveSessionFetch,
  ambientEveSessionId,
  EVE_SESSION_HEADER
};
