// Places/geography answers extracted from Gemini's Google Maps grounding.
// Unlike the harvest-style search tools, Maps grounding returns the model's
// grounded ANSWER with source citations rather than raw results — so here the
// driver model genuinely authors the reply, and the deliverable is a bounded
// answer plus its sources. Grounding tools cannot be forced via toolChoice;
// the prompt instructs the driver, and an ungrounded reply fails closed.

import { google } from "@ai-sdk/google";
import { generateText, type ToolSet } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { mediaInvocationHeaders } from "./media-lineage";
import { parseSearchResultUrl, type SearchInvocationLineage } from "./search-contracts";
import { CLOUD_TOOL_META } from "./tool-meta";

export const DEFAULT_MAPS_SEARCH_DRIVER_MODEL = "google/gemini-3-flash";
export const MAPS_SEARCH_ADAPTER_REVISION = "2026-07-12.1";
const MAX_ANSWER_CHARS = 8_000;
const MAX_SOURCES = 20;

export const MapsSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(2000).describe("A places/geography question, e.g. 'coffee shops near the Ferry Building open after 9pm'."),
});

const SourceSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
});

export const MapsSearchOutputSchema = z.object({
  query: z.string(),
  answer: z.string(),
  sources: z.array(SourceSchema),
});

export type MapsSearchInput = z.infer<typeof MapsSearchInputSchema>;
export type MapsSearchOutput = z.infer<typeof MapsSearchOutputSchema>;

export interface MapsDriverResult {
  readonly text: string;
  readonly sources: readonly unknown[];
}

export interface MapsSearchToolOptions {
  readonly driverModelId?: string;
  readonly generate?: (options: Parameters<typeof generateText>[0]) => Promise<MapsDriverResult>;
}

export function mapsSearchTool(options: MapsSearchToolOptions = {}) {
  const driverModelId = options.driverModelId ?? DEFAULT_MAPS_SEARCH_DRIVER_MODEL;
  const generate = options.generate ?? generateText;

  return defineTool({
    description: CLOUD_TOOL_META["maps-search"].description,
    inputSchema: MapsSearchInputSchema,
    outputSchema: MapsSearchOutputSchema,
    async execute(input): Promise<MapsSearchOutput> {
      const lineage: SearchInvocationLineage = {
        operation: "search.maps",
        concreteModelId: driverModelId,
        catalogSnapshotId: null,
        catalogStatus: "unavailable",
        adapterRevision: MAPS_SEARCH_ADAPTER_REVISION,
        estimate: { confidence: "unknown" },
      };
      // The grounding tool's empty-object generics don't unify with ToolSet's
      // Tool variance under exactOptionalPropertyTypes; the assertion is
      // confined here — the factory is the AI SDK's own typed google_maps tool.
      const googleMapsTool = google.tools.googleMaps({}) as unknown as ToolSet[string];
      let driven: MapsDriverResult;
      try {
        driven = await generate({
          model: zoGateway().languageModel(driverModelId),
          prompt: `Answer this places question using Google Maps data. Be specific: names, addresses, and hours where relevant. Question: ${input.query}`,
          // Grounding tools are provider-defined; the name must be google_maps.
          tools: { google_maps: googleMapsTool },
          headers: { [ZO_TOOL_HEADER]: "maps_search", ...mediaInvocationHeaders(lineage) },
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
        // Grounding can't be forced via toolChoice, so an answer without
        // source citations is ungrounded model prose — fail closed rather
        // than return it as Maps data.
        throw new Error("Maps search produced an answer without Maps grounding sources; it was discarded. Retry with a more specific places question.");
      }
      return {
        query: input.query,
        answer: answer.slice(0, MAX_ANSWER_CHARS),
        sources,
      };
    },
    toModelOutput(output) {
      const sources = output.sources.length === 0
        ? ""
        : `\n\nSources:\n${output.sources.map((source) => `- ${source.title ?? source.url}: ${source.url}`).join("\n")}`;
      return { type: "text", value: `${output.answer}${sources}` };
    },
  });
}

function parseSources(sources: readonly unknown[]): MapsSearchOutput["sources"] {
  const parsed: { url: string; title?: string }[] = [];
  for (const source of sources.slice(0, MAX_SOURCES)) {
    if (!isRecord(source)) continue;
    const url = parseSearchResultUrl(source.url);
    if (url === null) continue;
    const title = typeof source.title === "string" ? source.title.trim() : "";
    parsed.push({ url, ...(title.length === 0 ? {} : { title }) });
  }
  return parsed;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : "unknown error";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default mapsSearchTool();
