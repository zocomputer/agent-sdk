// ../../../../../tmp/agent-sdk-mirror-pyFJSK/repo/platform/cloud-tools/maps-search.ts
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

// ../../../../../tmp/agent-sdk-mirror-pyFJSK/repo/platform/runtime-ai/gateway.ts
import { createGateway } from "ai";

// ../../../../../tmp/agent-sdk-mirror-pyFJSK/repo/platform/runtime-ai/session-fetch.ts
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

// ../../../../../tmp/agent-sdk-mirror-pyFJSK/repo/platform/runtime-ai/stream-guards.ts
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

// ../../../../../tmp/agent-sdk-mirror-pyFJSK/repo/platform/runtime-ai/gateway-config.ts
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

// ../../../../../tmp/agent-sdk-mirror-pyFJSK/repo/platform/runtime-ai/gateway.ts
function zoGateway(options = {}) {
  return createGateway(zoGatewaySettings(options));
}
// ../../../../../tmp/agent-sdk-mirror-pyFJSK/repo/platform/cloud-tools/media-lineage.ts
var ZO_MEDIA_LINEAGE_HEADER = "x-zo-media-lineage";
var MAX_MEDIA_LINEAGE_HEADER_LENGTH = 1024;
function serializeMediaInvocationLineage(lineage) {
  const value = JSON.stringify(lineage);
  if (value.length > MAX_MEDIA_LINEAGE_HEADER_LENGTH) {
    throw new Error("media invocation lineage exceeds the internal header limit");
  }
  return value;
}
function mediaInvocationHeaders(lineage) {
  return { [ZO_MEDIA_LINEAGE_HEADER]: serializeMediaInvocationLineage(lineage) };
}

// ../../../../../tmp/agent-sdk-mirror-pyFJSK/repo/platform/cloud-tools/search-contracts.ts
function parseSearchResultUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0)
    return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:" || url.hostname.length === 0 || url.username.length > 0 || url.password.length > 0) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

// ../../../../../tmp/agent-sdk-mirror-pyFJSK/repo/platform/cloud-tools/tool-meta.ts
var CLOUD_TOOL_META = {
  image: {
    description: "Generate images from text and optional durable references. Use media_models to inspect model-specific settings and prices."
  },
  "edit-image": {
    description: "Edit a durable image asset with optional mask and reference assets. Use media_models before selecting advanced settings."
  },
  video: {
    description: "Generate a video from text, frames, or a durable image reference. Use media_models to inspect capabilities and prices."
  },
  "edit-video": {
    description: "Edit a durable video asset through a verified model adapter."
  },
  "generate-speech": {
    description: "Generate spoken audio from text and save it as a durable asset. Use media_models to inspect voices, formats, and prices."
  },
  "transcribe-audio": {
    description: "Transcribe a durable audio asset with bounded inline text and optional JSON, SRT, or VTT spill output."
  },
  "media-models": {
    description: "List current media models or inspect one model's operations, settings, availability, provenance, and pricing."
  },
  "web-search": {
    description: "Search the web through a chosen provider (Exa, Parallel, or Perplexity) with domain and freshness filters. Use search_providers to compare providers."
  },
  "search-providers": {
    description: "List the available web search providers, their strengths, and supported options."
  },
  "x-search": {
    description: "Search X (Twitter) posts with handle and date filters, including image and video understanding."
  },
  "maps-search": {
    description: "Answer places and geography questions with Google Maps data: businesses, addresses, hours, and areas."
  }
};

// ../../../../../tmp/agent-sdk-mirror-pyFJSK/repo/platform/cloud-tools/maps-search.ts
var DEFAULT_MAPS_SEARCH_DRIVER_MODEL = "google/gemini-3-flash";
var MAPS_SEARCH_ADAPTER_REVISION = "2026-07-12.1";
var MAX_ANSWER_CHARS = 8000;
var MAX_SOURCES = 20;
var MapsSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(2000).describe("A places/geography question, e.g. 'coffee shops near the Ferry Building open after 9pm'.")
});
var SourceSchema = z.object({
  url: z.string(),
  title: z.string().optional()
});
var MapsSearchOutputSchema = z.object({
  query: z.string(),
  answer: z.string(),
  sources: z.array(SourceSchema)
});
function mapsSearchTool(options = {}) {
  const driverModelId = options.driverModelId ?? DEFAULT_MAPS_SEARCH_DRIVER_MODEL;
  const generate = options.generate ?? generateText;
  return defineTool({
    description: CLOUD_TOOL_META["maps-search"].description,
    inputSchema: MapsSearchInputSchema,
    outputSchema: MapsSearchOutputSchema,
    async execute(input) {
      const lineage = {
        operation: "search.maps",
        concreteModelId: driverModelId,
        catalogSnapshotId: null,
        catalogStatus: "unavailable",
        adapterRevision: MAPS_SEARCH_ADAPTER_REVISION,
        estimate: { confidence: "unknown" }
      };
      const googleMapsTool = google.tools.googleMaps({});
      let driven;
      try {
        driven = await generate({
          model: zoGateway().languageModel(driverModelId),
          prompt: `Answer this places question using Google Maps data. Be specific: names, addresses, and hours where relevant. Question: ${input.query}`,
          tools: { google_maps: googleMapsTool },
          headers: { [ZO_TOOL_HEADER]: "maps_search", ...mediaInvocationHeaders(lineage) }
        });
      } catch (error) {
        throw new Error(`Maps search failed before returning an answer: ${errorText(error)}. Retry with a simpler question.`);
      }
      const answer = driven.text.trim();
      if (answer.length === 0) {
        throw new Error("Maps search returned an empty answer. Retry with a simpler question.");
      }
      const sources = parseSources(driven.sources);
      if (sources.length === 0) {
        throw new Error("Maps search produced an answer without Maps grounding sources; it was discarded. Retry with a more specific places question.");
      }
      return {
        query: input.query,
        answer: answer.slice(0, MAX_ANSWER_CHARS),
        sources
      };
    },
    toModelOutput(output) {
      const sources = output.sources.length === 0 ? "" : `

Sources:
${output.sources.map((source) => `- ${source.title ?? source.url}: ${source.url}`).join(`
`)}`;
      return { type: "text", value: `${output.answer}${sources}` };
    }
  });
}
function parseSources(sources) {
  const parsed = [];
  for (const source of sources.slice(0, MAX_SOURCES)) {
    if (!isRecord(source))
      continue;
    const url = parseSearchResultUrl(source.url);
    if (url === null)
      continue;
    const title = typeof source.title === "string" ? source.title.trim() : "";
    parsed.push({ url, ...title.length === 0 ? {} : { title } });
  }
  return parsed;
}
function errorText(error) {
  return error instanceof Error ? error.message.slice(0, 500) : "unknown error";
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var maps_search_default = mapsSearchTool();
export {
  mapsSearchTool,
  maps_search_default as default,
  MapsSearchOutputSchema,
  MapsSearchInputSchema,
  MAPS_SEARCH_ADAPTER_REVISION,
  DEFAULT_MAPS_SEARCH_DRIVER_MODEL
};
