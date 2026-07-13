// Gateway-executed web search as a focused tool. There is no standalone search
// endpoint on the AI gateway — Exa/Parallel/Perplexity search exist only as
// provider-executed tools inside a model turn — so this tool runs a minimal
// "driver" call: a cheap model given the query, exactly one search tool
// attached, toolChoice forced to it, and the tool's structured results
// harvested from the response. The driver model is an adapter, not an author:
// its prose never reaches the transcript.

import { generateText, type ToolSet } from "ai";

import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { mediaInvocationHeaders } from "./media-lineage";
import {
  DEFAULT_SEARCH_PROVIDER,
  searchProviderAdapter,
  SEARCH_PROVIDER_ADAPTERS,
  type NormalizedWebSearchOptions,
} from "./search-adapters";
import { validateSearchSettings, type SearchInvocationLineage } from "./search-contracts";
import { CLOUD_TOOL_META } from "./tool-meta";

export const DEFAULT_SEARCH_DRIVER_MODEL = "google/gemini-3-flash";

// The schema is the superset across providers, like the media tool schemas
// across models: provider-specific settings are validated against the SELECTED
// adapter's declaration, and an unsupported combination is a corrective error
// before any paid call — never a silent drop. search_providers lists which
// provider honors which setting.
export const WebSearchInputSchema = z.object({
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
  max_chars_per_result: z.number().int().min(100).max(10_000).optional().describe("Maximum extracted characters per result (exa, parallel)."),
  max_age_seconds: z.number().int().min(0).max(604_800).optional().describe("Maximum cached-content age; 0 always fetches fresh (parallel)."),
});

const ResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  excerpt: z.string(),
  published: z.string().optional(),
});

export const WebSearchOutputSchema = z.object({
  provider: z.string(),
  query: z.string(),
  results: z.array(ResultSchema),
});

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;
export type WebSearchOutput = z.infer<typeof WebSearchOutputSchema>;

/** The slice of a generateText result the search lane reads. */
export interface DriverCallResult {
  readonly toolResults: readonly { readonly output?: unknown }[];
}

export interface WebSearchToolOptions {
  readonly driverModelId?: string;
  readonly generate?: (options: Parameters<typeof generateText>[0]) => Promise<DriverCallResult>;
  readonly now?: () => Date;
}

export function webSearchTool(options: WebSearchToolOptions = {}) {
  const driverModelId = options.driverModelId ?? DEFAULT_SEARCH_DRIVER_MODEL;
  const generate = options.generate ?? generateText;
  const now = options.now ?? (() => new Date());

  return defineTool({
    description: CLOUD_TOOL_META["web-search"].description,
    inputSchema: WebSearchInputSchema,
    outputSchema: WebSearchOutputSchema,
    async execute(input): Promise<WebSearchOutput> {
      const adapter = searchProviderAdapter(input.provider ?? DEFAULT_SEARCH_PROVIDER);
      if (adapter === null) {
        throw new Error(
          `Unknown search provider. Choose one of: ${SEARCH_PROVIDER_ADAPTERS.map(({ id }) => id).join(", ")}. No search was run.`,
        );
      }
      // Validate every supplied setting against the SELECTED provider's
      // declaration — a knob the provider doesn't honor is a corrective error,
      // not a silent drop.
      const invalid = validateSearchSettings(
        {
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
          max_age_seconds: input.max_age_seconds,
        },
        adapter.settings,
        adapter.id,
      );
      if (invalid !== null) {
        throw new Error(`${invalid} No search was run.`);
      }
      const normalized: NormalizedWebSearchOptions = {
        query: input.query,
        ...(input.max_results === undefined ? {} : { maxResults: input.max_results }),
        ...(input.include_domains === undefined ? {} : { includeDomains: input.include_domains }),
        ...(input.exclude_domains === undefined ? {} : { excludeDomains: input.exclude_domains }),
        ...(input.freshness === undefined ? {} : { freshness: input.freshness }),
        ...(input.country === undefined ? {} : { country: input.country }),
        ...(input.search_type === undefined ? {} : { searchType: input.search_type }),
        ...(input.category === undefined ? {} : { category: input.category }),
        ...(input.languages === undefined ? {} : { languages: input.languages }),
        ...(input.mode === undefined ? {} : { mode: input.mode }),
        ...(input.max_chars_per_result === undefined ? {} : { maxCharsPerResult: input.max_chars_per_result }),
        ...(input.max_age_seconds === undefined ? {} : { maxAgeSeconds: input.max_age_seconds }),
        now,
      };
      const built = adapter.buildTool(normalized);
      const lineage: SearchInvocationLineage = {
        operation: "search.web",
        concreteModelId: driverModelId,
        catalogSnapshotId: null,
        catalogStatus: "unavailable",
        adapterRevision: adapter.revision,
        estimate: { confidence: "unknown" },
      };
      let driven: DriverCallResult;
      try {
        driven = await generate({
          model: zoGateway().languageModel(driverModelId),
          prompt: `Call the ${built.name} tool exactly once for this query, verbatim, then stop: ${input.query}`,
          tools: { [built.name]: built.tool } satisfies ToolSet,
          toolChoice: { type: "tool", toolName: built.name },
          headers: { [ZO_TOOL_HEADER]: "web_search", ...mediaInvocationHeaders(lineage) },
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
        value: output.results
          .map((result, index) => formatResult(result, index))
          .join("\n\n"),
      };
    },
  });
}

function formatResult(
  result: { readonly title: string; readonly url: string; readonly excerpt: string; readonly published?: string | undefined },
  index: number,
): string {
  const date = result.published === undefined ? "" : ` (${result.published})`;
  return `${index + 1}. ${result.title}${date}\n${result.url}\n${result.excerpt}`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : "unknown error";
}

export default webSearchTool();
