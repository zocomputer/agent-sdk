// The frozen vocabulary for the gateway-executed search lane, sibling to
// media-contracts. Search capabilities are not standalone endpoints: they are
// provider-executed tools that only exist inside a model turn, so every search
// tool here runs a minimal "driver" model call whose sole job is to trigger the
// tool and harvest its structured results (see web-search.ts).

import type { MediaCostEstimate } from "./media-contracts";

/** Paid search operations, extending the lineage vocabulary beyond media. */
export type SearchOperation = "search.web" | "search.x" | "search.maps";

/**
 * One scalar (or string-list) setting a search provider adapter declares —
 * the search lane's counterpart to MediaSettingDefinition. Declarations drive
 * three things at once: `search_providers` discovery, pre-call validation
 * (an unsupported setting for the selected provider is a corrective error,
 * never a silent drop), and the conformance loop proving each declared
 * setting changes the driver call. A setting exists only if the adapter's
 * `buildTool` forwards it.
 */
export type SearchSettingDefinition =
  | { readonly kind: "enum"; readonly name: string; readonly description: string; readonly values: readonly string[] }
  | { readonly kind: "integer"; readonly name: string; readonly description: string; readonly min: number; readonly max: number }
  | { readonly kind: "string"; readonly name: string; readonly description: string; readonly maxLength: number }
  | { readonly kind: "string_list"; readonly name: string; readonly description: string; readonly maxItems: number };

/** Validate one provider's declared settings against the supplied values. */
export function validateSearchSettings(
  settings: Readonly<Record<string, string | number | readonly string[] | undefined>>,
  definitions: readonly SearchSettingDefinition[],
  providerId: string,
): string | null {
  const declared = new Map(definitions.map((definition) => [definition.name, definition]));
  for (const [name, value] of Object.entries(settings)) {
    if (value === undefined) continue;
    const definition = declared.get(name);
    if (definition === undefined) {
      const supported = definitions.map(({ name: settingName }) => settingName).join(", ");
      return `Setting ${name} is not supported by the ${providerId} provider. Supported: ${supported}.`;
    }
    switch (definition.kind) {
      case "enum":
        if (typeof value !== "string" || !definition.values.includes(value)) return `Setting ${name} must be one of: ${definition.values.join(", ")}.`;
        break;
      case "integer":
        if (typeof value !== "number" || !Number.isInteger(value) || value < definition.min || value > definition.max) return `Setting ${name} must be an integer between ${definition.min} and ${definition.max}.`;
        break;
      case "string":
        if (typeof value !== "string" || value.length === 0 || value.length > definition.maxLength) return `Setting ${name} must be a non-empty string of at most ${definition.maxLength} characters.`;
        break;
      case "string_list":
        if (!Array.isArray(value) || value.length === 0 || value.length > definition.maxItems || value.some((item) => typeof item !== "string")) return `Setting ${name} must be a list of at most ${definition.maxItems} strings.`;
        break;
    }
  }
  return null;
}

/** One normalized, bounded web search hit — the only shape re-entering the transcript. */
export interface WebSearchResultItem {
  readonly title: string;
  readonly url: string;
  readonly excerpt: string;
  readonly published?: string;
}

/**
 * Durable invocation facts for a search call, mirroring MediaInvocationLineage.
 * Search adapters are curated (no live catalog membership for search products),
 * so catalog fields record the driver-model posture: `catalogStatus:
 * "unavailable"` + `catalogSnapshotId: null`.
 */
export interface SearchInvocationLineage {
  readonly operation: SearchOperation;
  readonly concreteModelId: string;
  readonly catalogSnapshotId: null;
  readonly catalogStatus: "unavailable";
  readonly adapterRevision: string;
  readonly estimate: MediaCostEstimate;
}

export const MAX_SEARCH_RESULTS = 20;
export const MAX_EXCERPT_CHARS = 2_000;
export const MAX_TOTAL_EXCERPT_CHARS = 24_000;

/**
 * Normalize an untrusted provider citation/result URL. Empty strings, relative
 * URLs, non-HTTP schemes, and credential-bearing URLs cannot count as search
 * evidence and never re-enter the model transcript.
 */
export function parseSearchResultUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.hostname.length === 0 ||
      url.username.length > 0 ||
      url.password.length > 0
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

/** Bound one normalized result list before it re-enters the model transcript. */
export function boundSearchResults(
  items: readonly WebSearchResultItem[],
): readonly WebSearchResultItem[] {
  const bounded: WebSearchResultItem[] = [];
  let totalChars = 0;
  for (const item of items.slice(0, MAX_SEARCH_RESULTS)) {
    const excerpt = item.excerpt.slice(0, MAX_EXCERPT_CHARS);
    if (totalChars + excerpt.length > MAX_TOTAL_EXCERPT_CHARS) break;
    totalChars += excerpt.length;
    bounded.push({ ...item, excerpt });
  }
  return bounded;
}
