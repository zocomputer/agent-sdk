// ../../../../../tmp/agent-sdk-mirror-EQ4qmQ/repo/platform/runtime-ai/gateway.ts
import { createGateway } from "ai";

// ../../../../../tmp/agent-sdk-mirror-EQ4qmQ/repo/platform/runtime-ai/session-fetch.ts
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

// ../../../../../tmp/agent-sdk-mirror-EQ4qmQ/repo/platform/runtime-ai/gateway.ts
var DEFAULT_ZO_AI_BASE_URL = "http://localhost:4000/runtime/ai/v4/ai";
var DEFAULT_ZO_AI_KEY = "dev-proxy";
function resolveZoGatewayBaseUrl(baseURL = process.env.ZO_AI_BASE_URL) {
  const trimmed = baseURL?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_BASE_URL;
}
function resolveZoGatewayApiKey(apiKey = process.env.ZO_AI_KEY) {
  const trimmed = apiKey?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_KEY;
}
function zoGateway(options = {}) {
  return createGateway({
    ...options,
    apiKey: resolveZoGatewayApiKey(options.apiKey),
    baseURL: resolveZoGatewayBaseUrl(options.baseURL),
    fetch: eveSessionFetch(undefined, options.fetch)
  });
}

// ../../../../../tmp/agent-sdk-mirror-EQ4qmQ/repo/platform/runtime-ai/register.ts
var SLOT = "AI_SDK_DEFAULT_PROVIDER";
if (!(SLOT in globalThis)) {
  Object.defineProperty(globalThis, SLOT, {
    value: zoGateway(),
    writable: false,
    configurable: false,
    enumerable: false
  });
}
