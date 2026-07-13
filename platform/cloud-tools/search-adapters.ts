// The curated web-search provider directory — the search lane's counterpart to
// MEDIA_PROVIDER_ADAPTERS. Each adapter declares its settings vocabulary
// (shared neutrals plus provider-specific knobs), how each lands on the
// gateway tool's typed config, how its typed output normalizes into bounded
// WebSearchResultItems, and a revision/verifiedAt stamp. Search providers have
// no live catalog membership (they are gateway tools, not /v1/models rows), so
// the directory is the source of truth and the AI SDK's config/output types
// are the drift guard: a gateway package bump that reshapes a config stops
// compiling here. `search-conformance.test.ts` proves every declared setting
// changes the driver call.

import { gateway } from "@ai-sdk/gateway";
import type { Tool } from "ai";
import type { MediaResult } from "./media-contracts";
import {
  boundSearchResults,
  parseSearchResultUrl,
  type SearchSettingDefinition,
  type WebSearchResultItem,
} from "./search-contracts";

// Provider-defined tool factories: static definitions on the provider surface,
// independent of any instance config (no env read or network at import time).
const gatewayTools = gateway.tools;

/** Validated settings an adapter maps onto its provider tool config. */
export interface NormalizedWebSearchOptions {
  readonly query: string;
  readonly maxResults?: number;
  readonly includeDomains?: readonly string[];
  readonly excludeDomains?: readonly string[];
  readonly freshness?: "day" | "week" | "month" | "year";
  readonly country?: string;
  readonly searchType?: "auto" | "fast" | "instant";
  readonly category?: "company" | "people" | "research paper" | "news" | "personal site" | "financial report";
  readonly languages?: readonly string[];
  readonly mode?: "one-shot" | "agentic";
  readonly maxCharsPerResult?: number;
  readonly maxAgeSeconds?: number;
  /** Injectable clock for freshness → date-cutoff mapping. */
  readonly now: () => Date;
}

export type SearchProviderId = "exa" | "parallel" | "perplexity";

export interface SearchProviderAdapter {
  readonly id: SearchProviderId;
  readonly description: string;
  /** What distinguishes this provider — surfaced by `search_providers` discovery. */
  readonly strengths: string;
  readonly revision: string;
  readonly verifiedAt: string;
  /** Every setting this provider honors — discovery, validation, and conformance iterate this. */
  readonly settings: readonly SearchSettingDefinition[];
  /** Build the provider-executed tool entry for one invocation. */
  readonly buildTool: (options: NormalizedWebSearchOptions) => {
    readonly name: string;
    readonly tool: Tool;
  };
  /** Parse the provider-executed tool's output from unknown into bounded results. */
  readonly parseResults: (output: unknown) => MediaResult<readonly WebSearchResultItem[], string>;
}

export const DEFAULT_SEARCH_PROVIDER: SearchProviderId = "exa";

const SHARED_SETTINGS: readonly SearchSettingDefinition[] = [
  { kind: "integer", name: "max_results", description: "Maximum results to return", min: 1, max: 20 },
  { kind: "string_list", name: "include_domains", description: "Restrict results to these domains", maxItems: 10 },
  { kind: "string_list", name: "exclude_domains", description: "Exclude results from these domains", maxItems: 10 },
  { kind: "enum", name: "freshness", description: "Only content published within this window", values: ["day", "week", "month", "year"] },
];

const EXA_CATEGORIES = ["company", "people", "research paper", "news", "personal site", "financial report"] as const;

function freshnessCutoffIso(freshness: "day" | "week" | "month" | "year", now: Date): string {
  const days = { day: 1, week: 7, month: 30, year: 365 }[freshness];
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return cutoff.toISOString().slice(0, 10);
}

export const SEARCH_PROVIDER_ADAPTERS: readonly SearchProviderAdapter[] = [
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
      { kind: "integer", name: "max_chars_per_result", description: "Maximum extracted characters per result", min: 100, max: 10_000 },
    ],
    buildTool: (options) => ({
      name: "exa_search",
      tool: gatewayTools.exaSearch({
        ...(options.maxResults === undefined ? {} : { numResults: options.maxResults }),
        ...(options.includeDomains === undefined ? {} : { includeDomains: [...options.includeDomains] }),
        ...(options.excludeDomains === undefined ? {} : { excludeDomains: [...options.excludeDomains] }),
        ...(options.freshness === undefined
          ? {}
          : { startPublishedDate: freshnessCutoffIso(options.freshness, options.now()) }),
        ...(options.searchType === undefined ? {} : { type: options.searchType }),
        ...(options.category === undefined ? {} : { category: options.category }),
        ...(options.country === undefined ? {} : { userLocation: options.country }),
        contents: {
          highlights: true,
          ...(options.maxCharsPerResult === undefined ? {} : { text: { maxCharacters: options.maxCharsPerResult } }),
        },
      }),
    }),
    parseResults: (output) => {
      const failure = searchToolError(output);
      if (failure !== null) return { ok: false, error: failure };
      if (!isRecord(output) || !Array.isArray(output.results)) {
        return { ok: false, error: "Exa returned an unrecognized result shape." };
      }
      const items: WebSearchResultItem[] = [];
      for (const result of output.results) {
        if (!isRecord(result) || typeof result.title !== "string") continue;
        const url = parseSearchResultUrl(result.url);
        if (url === null) continue;
        const highlights = Array.isArray(result.highlights)
          ? result.highlights.filter((value): value is string => typeof value === "string").join(" … ")
          : "";
        const excerpt =
          typeof result.summary === "string" && result.summary.length > 0
            ? result.summary
            : typeof result.text === "string" && result.text.length > 0
              ? result.text
              : highlights;
        items.push({
          title: result.title,
          url,
          excerpt,
          ...(typeof result.publishedDate === "string" ? { published: result.publishedDate } : {}),
        });
      }
      return { ok: true, value: boundSearchResults(items) };
    },
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
      { kind: "integer", name: "max_chars_per_result", description: "Maximum excerpt characters per result", min: 100, max: 10_000 },
      { kind: "integer", name: "max_age_seconds", description: "Maximum cached-content age; 0 always fetches fresh", min: 0, max: 604_800 },
    ],
    buildTool: (options) => ({
      name: "parallel_search",
      tool: gatewayTools.parallelSearch({
        mode: options.mode ?? "agentic",
        ...(options.maxResults === undefined ? {} : { maxResults: options.maxResults }),
        ...(options.maxCharsPerResult === undefined ? {} : { excerpts: { maxCharsPerResult: options.maxCharsPerResult } }),
        ...(options.maxAgeSeconds === undefined ? {} : { fetchPolicy: { maxAgeSeconds: options.maxAgeSeconds } }),
        sourcePolicy: {
          ...(options.includeDomains === undefined ? {} : { includeDomains: [...options.includeDomains] }),
          ...(options.excludeDomains === undefined ? {} : { excludeDomains: [...options.excludeDomains] }),
          ...(options.freshness === undefined
            ? {}
            : { afterDate: freshnessCutoffIso(options.freshness, options.now()) }),
        },
      }),
    }),
    parseResults: (output) => {
      const failure = searchToolError(output);
      if (failure !== null) return { ok: false, error: failure };
      if (!isRecord(output) || !Array.isArray(output.results)) {
        return { ok: false, error: "Parallel returned an unrecognized result shape." };
      }
      const items: WebSearchResultItem[] = [];
      for (const result of output.results) {
        if (!isRecord(result) || typeof result.title !== "string") continue;
        const url = parseSearchResultUrl(result.url);
        if (url === null) continue;
        items.push({
          title: result.title,
          url,
          excerpt: typeof result.excerpt === "string" ? result.excerpt : "",
          ...(typeof result.publishDate === "string" ? { published: result.publishDate } : {}),
        });
      }
      return { ok: true, value: boundSearchResults(items) };
    },
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
      { kind: "string_list", name: "languages", description: "ISO 639-1 language codes to filter results", maxItems: 10 },
    ],
    buildTool: (options) => ({
      name: "perplexity_search",
      tool: gatewayTools.perplexitySearch({
        ...(options.maxResults === undefined ? {} : { maxResults: options.maxResults }),
        // Perplexity folds include/exclude into one list; exclusions are `-domain`.
        ...(options.includeDomains === undefined && options.excludeDomains === undefined
          ? {}
          : {
              searchDomainFilter: [
                ...(options.includeDomains ?? []),
                ...(options.excludeDomains ?? []).map((domain) => `-${domain}`),
              ],
            }),
        ...(options.freshness === undefined ? {} : { searchRecencyFilter: options.freshness }),
        ...(options.country === undefined ? {} : { country: options.country }),
        ...(options.languages === undefined ? {} : { searchLanguageFilter: [...options.languages] }),
      }),
    }),
    parseResults: (output) => {
      const failure = searchToolError(output);
      if (failure !== null) return { ok: false, error: failure };
      if (!isRecord(output) || !Array.isArray(output.results)) {
        return { ok: false, error: "Perplexity returned an unrecognized result shape." };
      }
      const items: WebSearchResultItem[] = [];
      for (const result of output.results) {
        if (!isRecord(result) || typeof result.title !== "string") continue;
        const url = parseSearchResultUrl(result.url);
        if (url === null) continue;
        items.push({
          title: result.title,
          url,
          excerpt: typeof result.snippet === "string" ? result.snippet : "",
          ...(typeof result.date === "string" ? { published: result.date } : {}),
        });
      }
      return { ok: true, value: boundSearchResults(items) };
    },
  },
];

export function searchProviderAdapter(id: string): SearchProviderAdapter | null {
  return SEARCH_PROVIDER_ADAPTERS.find((adapter) => adapter.id === id) ?? null;
}

/** Every gateway search tool reports failures as `{ error, message }` output. */
function searchToolError(output: unknown): string | null {
  if (isRecord(output) && typeof output.error === "string" && typeof output.message === "string") {
    return `${output.error}: ${output.message}`;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
