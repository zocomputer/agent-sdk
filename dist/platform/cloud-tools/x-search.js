// ../../../../../tmp/agent-sdk-mirror-pyFJSK/repo/platform/cloud-tools/x-search.ts
import { xaiTools } from "@ai-sdk/xai";
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

// ../../../../../tmp/agent-sdk-mirror-pyFJSK/repo/platform/cloud-tools/x-search.ts
var DEFAULT_X_SEARCH_DRIVER_MODEL = "xai/grok-4.3";
var X_SEARCH_ADAPTER_REVISION = "2026-07-12.1";
var MAX_POST_CHARS = 1000;
var MAX_POSTS = 20;
var IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Use YYYY-MM-DD.");
var XSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(2000).describe("What to search X (Twitter) for."),
  allowed_x_handles: z.array(z.string().trim().min(1).max(50)).max(20).optional().describe("Only consider posts from these handles."),
  excluded_x_handles: z.array(z.string().trim().min(1).max(50)).max(20).optional().describe("Exclude posts from these handles."),
  from_date: IsoDateSchema.optional().describe("Earliest post date, YYYY-MM-DD."),
  to_date: IsoDateSchema.optional().describe("Latest post date, YYYY-MM-DD."),
  enable_image_understanding: z.boolean().optional().describe("Analyze images in posts during the search."),
  enable_video_understanding: z.boolean().optional().describe("Analyze videos in posts during the search.")
});
var PostSchema = z.object({
  author: z.string(),
  text: z.string(),
  url: z.string(),
  likes: z.number()
});
var XSearchOutputSchema = z.object({
  query: z.string(),
  posts: z.array(PostSchema)
});
function xSearchTool(options = {}) {
  const driverModelId = options.driverModelId ?? DEFAULT_X_SEARCH_DRIVER_MODEL;
  const generate = options.generate ?? generateText;
  return defineTool({
    description: CLOUD_TOOL_META["x-search"].description,
    inputSchema: XSearchInputSchema,
    outputSchema: XSearchOutputSchema,
    async execute(input) {
      if (input.allowed_x_handles !== undefined && input.excluded_x_handles !== undefined) {
        throw new Error("Give allowed_x_handles or excluded_x_handles, not both. No search was run.");
      }
      const tool = xaiTools.xSearch({
        ...input.allowed_x_handles === undefined ? {} : { allowedXHandles: [...input.allowed_x_handles] },
        ...input.excluded_x_handles === undefined ? {} : { excludedXHandles: [...input.excluded_x_handles] },
        ...input.from_date === undefined ? {} : { fromDate: input.from_date },
        ...input.to_date === undefined ? {} : { toDate: input.to_date },
        ...input.enable_image_understanding === undefined ? {} : { enableImageUnderstanding: input.enable_image_understanding },
        ...input.enable_video_understanding === undefined ? {} : { enableVideoUnderstanding: input.enable_video_understanding }
      });
      const lineage = {
        operation: "search.x",
        concreteModelId: driverModelId,
        catalogSnapshotId: null,
        catalogStatus: "unavailable",
        adapterRevision: X_SEARCH_ADAPTER_REVISION,
        estimate: { confidence: "unknown" }
      };
      let driven;
      try {
        driven = await generate({
          model: zoGateway().languageModel(driverModelId),
          prompt: `Call the x_search tool exactly once for this query, verbatim, then stop: ${input.query}`,
          tools: { x_search: tool },
          toolChoice: { type: "tool", toolName: "x_search" },
          headers: { [ZO_TOOL_HEADER]: "x_search", ...mediaInvocationHeaders(lineage) }
        });
      } catch (error) {
        throw new Error(`X search failed before returning results: ${errorText(error)}. Retry with a simpler query.`);
      }
      const posts = parsePosts(driven.toolResults.at(-1)?.output);
      if (posts === null) {
        throw new Error("The X search returned no readable posts. Retry with a simpler query.");
      }
      return { query: input.query, posts: [...posts] };
    },
    toModelOutput(output) {
      if (output.posts.length === 0) {
        return { type: "text", value: `No X posts found for: ${output.query}` };
      }
      return {
        type: "text",
        value: output.posts.map((post, index) => `${index + 1}. @${post.author} (${post.likes} likes)
${post.url}
${post.text}`).join(`

`)
      };
    }
  });
}
function parsePosts(output) {
  if (!isRecord(output) || !Array.isArray(output.posts))
    return null;
  const posts = [];
  for (const post of output.posts.slice(0, MAX_POSTS)) {
    if (!isRecord(post) || typeof post.author !== "string" || typeof post.text !== "string")
      continue;
    const url = parseSearchResultUrl(post.url);
    if (url === null)
      continue;
    posts.push({
      author: post.author,
      text: post.text.slice(0, MAX_POST_CHARS),
      url,
      likes: typeof post.likes === "number" && Number.isFinite(post.likes) ? post.likes : 0
    });
  }
  return posts;
}
function errorText(error) {
  return error instanceof Error ? error.message.slice(0, 500) : "unknown error";
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var x_search_default = xSearchTool();
export {
  xSearchTool,
  x_search_default as default,
  X_SEARCH_ADAPTER_REVISION,
  XSearchOutputSchema,
  XSearchInputSchema,
  DEFAULT_X_SEARCH_DRIVER_MODEL
};
