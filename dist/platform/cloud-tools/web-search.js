// ../../../../../tmp/agent-sdk-mirror-81kny2/repo/platform/cloud-tools/web-search.ts
import { generateText } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

// ../../../../../tmp/agent-sdk-mirror-81kny2/repo/platform/runtime-ai/gateway.ts
import { createGateway } from "ai";

// ../../../../../tmp/agent-sdk-mirror-81kny2/repo/platform/runtime-ai/session-fetch.ts
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

// ../../../../../tmp/agent-sdk-mirror-81kny2/repo/platform/runtime-ai/stream-guards.ts
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

// ../../../../../tmp/agent-sdk-mirror-81kny2/repo/platform/runtime-ai/gateway-config.ts
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

// ../../../../../tmp/agent-sdk-mirror-81kny2/repo/platform/runtime-ai/gateway.ts
function zoGateway(options = {}) {
  return createGateway(zoGatewaySettings(options));
}
// ../../../../../tmp/agent-sdk-mirror-81kny2/repo/platform/cloud-tools/media-lineage.ts
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

// ../../../../../tmp/agent-sdk-mirror-81kny2/repo/platform/cloud-tools/search-adapters.ts
import { gateway } from "@ai-sdk/gateway";

// ../../../../../tmp/agent-sdk-mirror-81kny2/repo/platform/cloud-tools/search-contracts.ts
function validateSearchSettings(settings, definitions, providerId) {
  const declared = new Map(definitions.map((definition) => [definition.name, definition]));
  for (const [name, value] of Object.entries(settings)) {
    if (value === undefined)
      continue;
    const definition = declared.get(name);
    if (definition === undefined) {
      const supported = definitions.map(({ name: settingName }) => settingName).join(", ");
      return `Setting ${name} is not supported by the ${providerId} provider. Supported: ${supported}.`;
    }
    switch (definition.kind) {
      case "enum":
        if (typeof value !== "string" || !definition.values.includes(value))
          return `Setting ${name} must be one of: ${definition.values.join(", ")}.`;
        break;
      case "integer":
        if (typeof value !== "number" || !Number.isInteger(value) || value < definition.min || value > definition.max)
          return `Setting ${name} must be an integer between ${definition.min} and ${definition.max}.`;
        break;
      case "string":
        if (typeof value !== "string" || value.length === 0 || value.length > definition.maxLength)
          return `Setting ${name} must be a non-empty string of at most ${definition.maxLength} characters.`;
        break;
      case "string_list":
        if (!Array.isArray(value) || value.length === 0 || value.length > definition.maxItems || value.some((item) => typeof item !== "string"))
          return `Setting ${name} must be a list of at most ${definition.maxItems} strings.`;
        break;
    }
  }
  return null;
}
var MAX_SEARCH_RESULTS = 20;
var MAX_EXCERPT_CHARS = 2000;
var MAX_TOTAL_EXCERPT_CHARS = 24000;
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
function boundSearchResults(items) {
  const bounded = [];
  let totalChars = 0;
  for (const item of items.slice(0, MAX_SEARCH_RESULTS)) {
    const excerpt = item.excerpt.slice(0, MAX_EXCERPT_CHARS);
    if (totalChars + excerpt.length > MAX_TOTAL_EXCERPT_CHARS)
      break;
    totalChars += excerpt.length;
    bounded.push({ ...item, excerpt });
  }
  return bounded;
}

// ../../../../../tmp/agent-sdk-mirror-81kny2/repo/platform/cloud-tools/search-adapters.ts
var gatewayTools = gateway.tools;
var DEFAULT_SEARCH_PROVIDER = "exa";
var SHARED_SETTINGS = [
  { kind: "integer", name: "max_results", description: "Maximum results to return", min: 1, max: 20 },
  { kind: "string_list", name: "include_domains", description: "Restrict results to these domains", maxItems: 10 },
  { kind: "string_list", name: "exclude_domains", description: "Exclude results from these domains", maxItems: 10 },
  { kind: "enum", name: "freshness", description: "Only content published within this window", values: ["day", "week", "month", "year"] }
];
var EXA_CATEGORIES = ["company", "people", "research paper", "news", "personal site", "financial report"];
function freshnessCutoffIso(freshness, now) {
  const days = { day: 1, week: 7, month: 30, year: 365 }[freshness];
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return cutoff.toISOString().slice(0, 10);
}
var SEARCH_PROVIDER_ADAPTERS = [
  {
    id: "exa",
    description: "Exa web search with token-efficient excerpts and highlights.",
    strengths: "Best default: agent-optimized excerpts, search-type and category filters, location-aware results.",
    revision: "2026-07-12.2",
    verifiedAt: "2026-07-12",
    settings: [
      ...SHARED_SETTINGS,
      { kind: "enum", name: "search_type", description: "Search method: auto balances, fast favors latency, instant favors cache", values: ["auto", "fast", "instant"] },
      { kind: "enum", name: "category", description: "Result category filter", values: EXA_CATEGORIES },
      { kind: "string", name: "country", description: "Two-letter ISO country code for location-aware results", maxLength: 2 },
      { kind: "integer", name: "max_chars_per_result", description: "Maximum extracted characters per result", min: 100, max: 1e4 }
    ],
    buildTool: (options) => ({
      name: "exa_search",
      tool: gatewayTools.exaSearch({
        ...options.maxResults === undefined ? {} : { numResults: options.maxResults },
        ...options.includeDomains === undefined ? {} : { includeDomains: [...options.includeDomains] },
        ...options.excludeDomains === undefined ? {} : { excludeDomains: [...options.excludeDomains] },
        ...options.freshness === undefined ? {} : { startPublishedDate: freshnessCutoffIso(options.freshness, options.now()) },
        ...options.searchType === undefined ? {} : { type: options.searchType },
        ...options.category === undefined ? {} : { category: options.category },
        ...options.country === undefined ? {} : { userLocation: options.country },
        contents: {
          highlights: true,
          ...options.maxCharsPerResult === undefined ? {} : { text: { maxCharacters: options.maxCharsPerResult } }
        }
      })
    }),
    parseResults: (output) => {
      const failure = searchToolError(output);
      if (failure !== null)
        return { ok: false, error: failure };
      if (!isRecord(output) || !Array.isArray(output.results)) {
        return { ok: false, error: "Exa returned an unrecognized result shape." };
      }
      const items = [];
      for (const result of output.results) {
        if (!isRecord(result) || typeof result.title !== "string")
          continue;
        const url = parseSearchResultUrl(result.url);
        if (url === null)
          continue;
        const highlights = Array.isArray(result.highlights) ? result.highlights.filter((value) => typeof value === "string").join(" … ") : "";
        const excerpt = typeof result.summary === "string" && result.summary.length > 0 ? result.summary : typeof result.text === "string" && result.text.length > 0 ? result.text : highlights;
        items.push({
          title: result.title,
          url,
          excerpt,
          ...typeof result.publishedDate === "string" ? { published: result.publishedDate } : {}
        });
      }
      return { ok: true, value: boundSearchResults(items) };
    }
  },
  {
    id: "parallel",
    description: "Parallel AI search returning LLM-optimized excerpts for one objective.",
    strengths: "Broad or multi-facet research objectives; one call replaces several keyword searches.",
    revision: "2026-07-12.2",
    verifiedAt: "2026-07-12",
    settings: [
      ...SHARED_SETTINGS,
      { kind: "enum", name: "mode", description: "one-shot returns comprehensive excerpts; agentic returns concise token-efficient ones", values: ["one-shot", "agentic"] },
      { kind: "integer", name: "max_chars_per_result", description: "Maximum excerpt characters per result", min: 100, max: 1e4 },
      { kind: "integer", name: "max_age_seconds", description: "Maximum cached-content age; 0 always fetches fresh", min: 0, max: 604800 }
    ],
    buildTool: (options) => ({
      name: "parallel_search",
      tool: gatewayTools.parallelSearch({
        mode: options.mode ?? "agentic",
        ...options.maxResults === undefined ? {} : { maxResults: options.maxResults },
        ...options.maxCharsPerResult === undefined ? {} : { excerpts: { maxCharsPerResult: options.maxCharsPerResult } },
        ...options.maxAgeSeconds === undefined ? {} : { fetchPolicy: { maxAgeSeconds: options.maxAgeSeconds } },
        sourcePolicy: {
          ...options.includeDomains === undefined ? {} : { includeDomains: [...options.includeDomains] },
          ...options.excludeDomains === undefined ? {} : { excludeDomains: [...options.excludeDomains] },
          ...options.freshness === undefined ? {} : { afterDate: freshnessCutoffIso(options.freshness, options.now()) }
        }
      })
    }),
    parseResults: (output) => {
      const failure = searchToolError(output);
      if (failure !== null)
        return { ok: false, error: failure };
      if (!isRecord(output) || !Array.isArray(output.results)) {
        return { ok: false, error: "Parallel returned an unrecognized result shape." };
      }
      const items = [];
      for (const result of output.results) {
        if (!isRecord(result) || typeof result.title !== "string")
          continue;
        const url = parseSearchResultUrl(result.url);
        if (url === null)
          continue;
        items.push({
          title: result.title,
          url,
          excerpt: typeof result.excerpt === "string" ? result.excerpt : "",
          ...typeof result.publishDate === "string" ? { published: result.publishDate } : {}
        });
      }
      return { ok: true, value: boundSearchResults(items) };
    }
  },
  {
    id: "perplexity",
    description: "Perplexity web search with regional, language, and recency filters.",
    strengths: "Recency-sensitive queries and regional or language-filtered lookups.",
    revision: "2026-07-12.2",
    verifiedAt: "2026-07-12",
    settings: [
      ...SHARED_SETTINGS,
      { kind: "string", name: "country", description: "Two-letter ISO country code for regional results", maxLength: 2 },
      { kind: "string_list", name: "languages", description: "ISO 639-1 language codes to filter results", maxItems: 10 }
    ],
    buildTool: (options) => ({
      name: "perplexity_search",
      tool: gatewayTools.perplexitySearch({
        ...options.maxResults === undefined ? {} : { maxResults: options.maxResults },
        ...options.includeDomains === undefined && options.excludeDomains === undefined ? {} : {
          searchDomainFilter: [
            ...options.includeDomains ?? [],
            ...(options.excludeDomains ?? []).map((domain) => `-${domain}`)
          ]
        },
        ...options.freshness === undefined ? {} : { searchRecencyFilter: options.freshness },
        ...options.country === undefined ? {} : { country: options.country },
        ...options.languages === undefined ? {} : { searchLanguageFilter: [...options.languages] }
      })
    }),
    parseResults: (output) => {
      const failure = searchToolError(output);
      if (failure !== null)
        return { ok: false, error: failure };
      if (!isRecord(output) || !Array.isArray(output.results)) {
        return { ok: false, error: "Perplexity returned an unrecognized result shape." };
      }
      const items = [];
      for (const result of output.results) {
        if (!isRecord(result) || typeof result.title !== "string")
          continue;
        const url = parseSearchResultUrl(result.url);
        if (url === null)
          continue;
        items.push({
          title: result.title,
          url,
          excerpt: typeof result.snippet === "string" ? result.snippet : "",
          ...typeof result.date === "string" ? { published: result.date } : {}
        });
      }
      return { ok: true, value: boundSearchResults(items) };
    }
  }
];
function searchProviderAdapter(id) {
  return SEARCH_PROVIDER_ADAPTERS.find((adapter) => adapter.id === id) ?? null;
}
function searchToolError(output) {
  if (isRecord(output) && typeof output.error === "string" && typeof output.message === "string") {
    return `${output.error}: ${output.message}`;
  }
  return null;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../../../../../tmp/agent-sdk-mirror-81kny2/repo/platform/cloud-tools/tool-meta.ts
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

// ../../../../../tmp/agent-sdk-mirror-81kny2/repo/platform/cloud-tools/web-search.ts
var DEFAULT_SEARCH_DRIVER_MODEL = "google/gemini-3-flash";
var WebSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(2000).describe("What to search the web for."),
  provider: z.enum(["exa", "parallel", "perplexity"]).optional().describe("Search provider; omit for the default. See search_providers."),
  max_results: z.number().int().min(1).max(20).optional().describe("Maximum results to return."),
  include_domains: z.array(z.string().trim().min(1).max(200)).max(10).optional().describe("Restrict results to these domains."),
  exclude_domains: z.array(z.string().trim().min(1).max(200)).max(10).optional().describe("Exclude results from these domains."),
  freshness: z.enum(["day", "week", "month", "year"]).optional().describe("Only include content published within this window."),
  country: z.string().trim().length(2).optional().describe("Two-letter ISO country code for regional results (exa, perplexity)."),
  search_type: z.enum(["auto", "fast", "instant"]).optional().describe("Search method (exa)."),
  category: z.enum(["company", "people", "research paper", "news", "personal site", "financial report"]).optional().describe("Result category filter (exa)."),
  languages: z.array(z.string().trim().min(2).max(8)).max(10).optional().describe("ISO 639-1 language codes to filter results (perplexity)."),
  mode: z.enum(["one-shot", "agentic"]).optional().describe("Excerpt style: comprehensive vs token-efficient (parallel)."),
  max_chars_per_result: z.number().int().min(100).max(1e4).optional().describe("Maximum extracted characters per result (exa, parallel)."),
  max_age_seconds: z.number().int().min(0).max(604800).optional().describe("Maximum cached-content age; 0 always fetches fresh (parallel).")
});
var ResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  excerpt: z.string(),
  published: z.string().optional()
});
var WebSearchOutputSchema = z.object({
  provider: z.string(),
  query: z.string(),
  results: z.array(ResultSchema)
});
function webSearchTool(options = {}) {
  const driverModelId = options.driverModelId ?? DEFAULT_SEARCH_DRIVER_MODEL;
  const generate = options.generate ?? generateText;
  const now = options.now ?? (() => new Date);
  return defineTool({
    description: CLOUD_TOOL_META["web-search"].description,
    inputSchema: WebSearchInputSchema,
    outputSchema: WebSearchOutputSchema,
    async execute(input) {
      const adapter = searchProviderAdapter(input.provider ?? DEFAULT_SEARCH_PROVIDER);
      if (adapter === null) {
        throw new Error(`Unknown search provider. Choose one of: ${SEARCH_PROVIDER_ADAPTERS.map(({ id }) => id).join(", ")}. No search was run.`);
      }
      const invalid = validateSearchSettings({
        max_results: input.max_results,
        include_domains: input.include_domains,
        exclude_domains: input.exclude_domains,
        freshness: input.freshness,
        country: input.country,
        search_type: input.search_type,
        category: input.category,
        languages: input.languages,
        mode: input.mode,
        max_chars_per_result: input.max_chars_per_result,
        max_age_seconds: input.max_age_seconds
      }, adapter.settings, adapter.id);
      if (invalid !== null) {
        throw new Error(`${invalid} No search was run.`);
      }
      const normalized = {
        query: input.query,
        ...input.max_results === undefined ? {} : { maxResults: input.max_results },
        ...input.include_domains === undefined ? {} : { includeDomains: input.include_domains },
        ...input.exclude_domains === undefined ? {} : { excludeDomains: input.exclude_domains },
        ...input.freshness === undefined ? {} : { freshness: input.freshness },
        ...input.country === undefined ? {} : { country: input.country },
        ...input.search_type === undefined ? {} : { searchType: input.search_type },
        ...input.category === undefined ? {} : { category: input.category },
        ...input.languages === undefined ? {} : { languages: input.languages },
        ...input.mode === undefined ? {} : { mode: input.mode },
        ...input.max_chars_per_result === undefined ? {} : { maxCharsPerResult: input.max_chars_per_result },
        ...input.max_age_seconds === undefined ? {} : { maxAgeSeconds: input.max_age_seconds },
        now
      };
      const built = adapter.buildTool(normalized);
      const lineage = {
        operation: "search.web",
        concreteModelId: driverModelId,
        catalogSnapshotId: null,
        catalogStatus: "unavailable",
        adapterRevision: adapter.revision,
        estimate: { confidence: "unknown" }
      };
      let driven;
      try {
        driven = await generate({
          model: zoGateway().languageModel(driverModelId),
          prompt: `Call the ${built.name} tool exactly once for this query, verbatim, then stop: ${input.query}`,
          tools: { [built.name]: built.tool },
          toolChoice: { type: "tool", toolName: built.name },
          headers: { [ZO_TOOL_HEADER]: "web_search", ...mediaInvocationHeaders(lineage) }
        });
      } catch (error) {
        throw new Error(`Web search failed before returning results: ${errorText(error)}. Retry, or pick another provider from search_providers.`);
      }
      const output = driven.toolResults.at(-1)?.output;
      if (output === undefined) {
        throw new Error("The search provider returned no tool result. Retry, or pick another provider from search_providers.");
      }
      const parsed = adapter.parseResults(output);
      if (!parsed.ok) {
        throw new Error(`Web search failed: ${parsed.error} Retry, or pick another provider from search_providers.`);
      }
      return { provider: adapter.id, query: input.query, results: [...parsed.value] };
    },
    toModelOutput(output) {
      if (output.results.length === 0) {
        return { type: "text", value: `No results from ${output.provider} for: ${output.query}` };
      }
      return {
        type: "text",
        value: output.results.map((result, index) => formatResult(result, index)).join(`

`)
      };
    }
  });
}
function formatResult(result, index) {
  const date = result.published === undefined ? "" : ` (${result.published})`;
  return `${index + 1}. ${result.title}${date}
${result.url}
${result.excerpt}`;
}
function errorText(error) {
  return error instanceof Error ? error.message.slice(0, 500) : "unknown error";
}
var web_search_default = webSearchTool();
export {
  webSearchTool,
  web_search_default as default,
  WebSearchOutputSchema,
  WebSearchInputSchema,
  DEFAULT_SEARCH_DRIVER_MODEL
};
