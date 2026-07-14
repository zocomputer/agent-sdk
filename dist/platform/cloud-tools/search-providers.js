// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/cloud-tools/search-providers.ts
import { defineTool } from "eve/tools";
import { z } from "zod";

// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/cloud-tools/search-adapters.ts
import { gateway } from "@ai-sdk/gateway";

// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/cloud-tools/search-contracts.ts
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

// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/cloud-tools/search-adapters.ts
var gatewayTools = gateway.tools;
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
function searchToolError(output) {
  if (isRecord(output) && typeof output.error === "string" && typeof output.message === "string") {
    return `${output.error}: ${output.message}`;
  }
  return null;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/cloud-tools/tool-meta.ts
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

// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/cloud-tools/search-providers.ts
var SearchProvidersInputSchema = z.object({
  provider: z.enum(["exa", "parallel", "perplexity"]).optional().describe("Inspect one provider; omit to list all.")
});
var SettingSchema = z.object({
  name: z.string(),
  kind: z.string(),
  description: z.string(),
  values: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional()
});
var ProviderSchema = z.object({
  id: z.string(),
  description: z.string(),
  strengths: z.string(),
  settings: z.array(SettingSchema),
  adapter_revision: z.string(),
  verified_at: z.string()
});
var SearchProvidersOutputSchema = z.object({
  default_provider: z.string(),
  providers: z.array(ProviderSchema)
});
function searchProvidersTool() {
  return defineTool({
    description: CLOUD_TOOL_META["search-providers"].description,
    inputSchema: SearchProvidersInputSchema,
    outputSchema: SearchProvidersOutputSchema,
    execute(input) {
      const roster = SEARCH_PROVIDER_ADAPTERS.filter((adapter) => input.provider === undefined || adapter.id === input.provider);
      if (roster.length === 0) {
        throw new Error(`Unknown provider. Choose one of: ${SEARCH_PROVIDER_ADAPTERS.map(({ id }) => id).join(", ")}.`);
      }
      return {
        default_provider: "exa",
        providers: roster.map((adapter) => ({
          id: adapter.id,
          description: adapter.description,
          strengths: adapter.strengths,
          settings: adapter.settings.map((setting) => ({
            name: setting.name,
            kind: setting.kind,
            description: setting.description,
            ...setting.kind === "enum" ? { values: [...setting.values] } : {},
            ...setting.kind === "integer" ? { min: setting.min, max: setting.max } : {}
          })),
          adapter_revision: adapter.revision,
          verified_at: adapter.verifiedAt
        }))
      };
    },
    toModelOutput(output) {
      return {
        type: "text",
        value: output.providers.map((provider) => {
          const settings = provider.settings.map((setting) => setting.values === undefined ? setting.name : `${setting.name} (${setting.values.join("|")})`).join(", ");
          return `${provider.id}${provider.id === output.default_provider ? " (default)" : ""}: ${provider.strengths} Settings: ${settings}.`;
        }).join(`
`)
      };
    }
  });
}
var search_providers_default = searchProvidersTool();
export {
  searchProvidersTool,
  search_providers_default as default,
  SearchProvidersOutputSchema,
  SearchProvidersInputSchema
};
