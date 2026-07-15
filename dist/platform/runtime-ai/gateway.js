// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/runtime-ai/gateway.ts
import { createGateway } from "ai";

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/runtime-ai/session-fetch.ts
var EVE_SESSION_HEADER = "x-zo-eve-session";
var EVE_TURN_HEADER = "x-zo-eve-turn";
var EVE_SUBAGENT_SESSION_HEADER = "x-zo-eve-subagent-session";
var EVE_CONTEXT_STORAGE_KEY = Symbol.for("eve.context-storage");
var SESSION_ID_KEY_NAME = "eve.sessionId";
var SESSION_KEY_NAME = "eve.session";
var PARENT_SESSION_KEY_NAME = "eve.parentSession";
function hasMethod(value, name) {
  return typeof value === "object" && value !== null && typeof value[name] === "function";
}
function ambientEveSessionId() {
  const value = ambientContextValue(SESSION_ID_KEY_NAME);
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
function ambientSessionParent() {
  const parent = ambientContextValue(PARENT_SESSION_KEY_NAME);
  if (typeof parent !== "object" || parent === null)
    return null;
  const rootSessionId = parent["rootSessionId"];
  const sessionId = parent["sessionId"];
  if (typeof rootSessionId !== "string" || rootSessionId.trim().length === 0)
    return null;
  if (typeof sessionId !== "string" || sessionId.trim().length === 0)
    return null;
  return { rootSessionId, sessionId };
}
function ambientEveTurnId() {
  const session = ambientContextValue(SESSION_KEY_NAME);
  if (typeof session !== "object" || session === null)
    return;
  const turn = session["turn"];
  if (typeof turn !== "object" || turn === null)
    return;
  const id = turn["id"];
  return typeof id === "string" && id.trim().length > 0 ? id : undefined;
}
function ambientContextValue(keyName) {
  const storage = Reflect.get(globalThis, EVE_CONTEXT_STORAGE_KEY);
  if (!hasMethod(storage, "getStore"))
    return;
  const store = storage.getStore();
  if (!hasMethod(store, "get"))
    return;
  return store.get({ name: keyName });
}
function eveSessionFetch(getSessionId = ambientEveSessionId, baseFetch = globalThis.fetch, getTurnId = ambientEveTurnId, getSessionParent = ambientSessionParent) {
  return Object.assign((input, init) => {
    const sessionId = getSessionId()?.trim();
    if (!sessionId)
      return baseFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const parent = getSessionParent();
    headers.set(EVE_SESSION_HEADER, parent?.rootSessionId ?? sessionId);
    const turnId = getTurnId()?.trim();
    if (turnId)
      headers.set(EVE_TURN_HEADER, turnId);
    else
      headers.delete(EVE_TURN_HEADER);
    if (parent)
      headers.set(EVE_SUBAGENT_SESSION_HEADER, sessionId);
    else
      headers.delete(EVE_SUBAGENT_SESSION_HEADER);
    return baseFetch(input, { ...init, headers });
  }, baseFetch);
}

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/runtime-ai/stream-guards.ts
var DEFAULT_STREAM_GUARDS = {
  firstByteMs: 60000,
  idleMs: 180000
};
function withStreamGuards(baseFetch, options = DEFAULT_STREAM_GUARDS) {
  const guarded = async (input, init) => {
    const controller = new AbortController;
    const outer = init?.signal;
    if (outer != null) {
      if (outer.aborted)
        controller.abort(outer.reason);
      else
        outer.addEventListener("abort", () => controller.abort(outer.reason), { once: true });
    }
    const firstByteTimer = setTimeout(() => {
      controller.abort(new Error(`gateway response headers not received within ${options.firstByteMs}ms`));
    }, options.firstByteMs);
    let response;
    try {
      response = await baseFetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(firstByteTimer);
    }
    const body = response.body;
    if (body === null)
      return response;
    const reader = body.getReader();
    const guarded2 = new ReadableStream({
      async pull(streamController) {
        let idleTimer;
        const idle = new Promise((_, reject) => {
          idleTimer = setTimeout(() => {
            const reason = new Error(`gateway stream idle for ${options.idleMs}ms`);
            controller.abort(reason);
            reject(reason);
          }, options.idleMs);
        });
        try {
          const result = await Promise.race([reader.read(), idle]);
          if (result.done)
            streamController.close();
          else
            streamController.enqueue(result.value);
        } catch (error) {
          await reader.cancel(error).catch(() => {});
          throw error;
        } finally {
          clearTimeout(idleTimer);
        }
      },
      async cancel(reason) {
        await reader.cancel(reason).catch(() => {});
      }
    });
    return new Response(guarded2, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };
  return Object.assign(guarded, { preconnect: globalThis.fetch.preconnect });
}

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/runtime-ai/gateway-config.ts
var ZO_TOOL_HEADER = "x-zo-tool";
var DEFAULT_ZO_AI_BASE_URL = "http://localhost:4000/runtime/ai/v4/ai";
var DEFAULT_ZO_AI_KEY = "dev-proxy";
var AGENT_TOKEN_HEADER = "x-zo-agent-token";
var AGENT_TOKEN_ENV = "ZO_AGENT_TOKEN";
function agentAuthHeaders(token = process.env[AGENT_TOKEN_ENV]) {
  const trimmed = token?.trim();
  return trimmed ? { [AGENT_TOKEN_HEADER]: trimmed } : {};
}
function resolveZoGatewayBaseUrl(baseURL = process.env.ZO_AI_BASE_URL) {
  const trimmed = baseURL?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_BASE_URL;
}
function resolveZoGatewayApiKey(apiKey = process.env.ZO_AI_KEY) {
  const trimmed = apiKey?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_KEY;
}
function zoGatewaySettings(options = {}) {
  return {
    ...options,
    headers: { ...agentAuthHeaders(), ...options.headers },
    apiKey: resolveZoGatewayApiKey(options.apiKey),
    baseURL: resolveZoGatewayBaseUrl(options.baseURL),
    fetch: withStreamGuards(eveSessionFetch(undefined, options.fetch))
  };
}

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/runtime-ai/gateway.ts
function zoGateway(options = {}) {
  return createGateway(zoGatewaySettings(options));
}
export {
  zoGatewaySettings,
  zoGateway,
  resolveZoGatewayBaseUrl,
  resolveZoGatewayApiKey,
  agentAuthHeaders,
  ZO_TOOL_HEADER,
  DEFAULT_ZO_AI_KEY,
  DEFAULT_ZO_AI_BASE_URL
};
