// X (Twitter) search extracted from Grok's provider-packaged x_search tool.
// The capability only exists on xAI models — a Claude- or Gemini-turn agent
// cannot call it — so this tool delegates one driver call to a Grok model with
// the tool forced, then harvests the structured posts. The xAI package's typed
// config/output are the drift guard for the option names.

import { xaiTools } from "@ai-sdk/xai";
import { generateText, type ToolSet } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { mediaInvocationHeaders } from "./media-lineage";
import { parseSearchResultUrl, type SearchInvocationLineage } from "./search-contracts";
import { CLOUD_TOOL_META } from "./tool-meta";

export const DEFAULT_X_SEARCH_DRIVER_MODEL = "xai/grok-4.3";
export const X_SEARCH_ADAPTER_REVISION = "2026-07-12.1";
const MAX_POST_CHARS = 1_000;
const MAX_POSTS = 20;

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Use YYYY-MM-DD.");

export const XSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(2000).describe("What to search X (Twitter) for."),
  allowed_x_handles: z.array(z.string().trim().min(1).max(50)).max(20).optional().describe("Only consider posts from these handles."),
  excluded_x_handles: z.array(z.string().trim().min(1).max(50)).max(20).optional().describe("Exclude posts from these handles."),
  from_date: IsoDateSchema.optional().describe("Earliest post date, YYYY-MM-DD."),
  to_date: IsoDateSchema.optional().describe("Latest post date, YYYY-MM-DD."),
  enable_image_understanding: z.boolean().optional().describe("Analyze images in posts during the search."),
  enable_video_understanding: z.boolean().optional().describe("Analyze videos in posts during the search."),
});

const PostSchema = z.object({
  author: z.string(),
  text: z.string(),
  url: z.string(),
  likes: z.number(),
});

export const XSearchOutputSchema = z.object({
  query: z.string(),
  posts: z.array(PostSchema),
});

export type XSearchInput = z.infer<typeof XSearchInputSchema>;
export type XSearchOutput = z.infer<typeof XSearchOutputSchema>;

export interface XSearchDriverResult {
  readonly toolResults: readonly { readonly output?: unknown }[];
}

export interface XSearchToolOptions {
  readonly driverModelId?: string;
  readonly generate?: (options: Parameters<typeof generateText>[0]) => Promise<XSearchDriverResult>;
}

export function xSearchTool(options: XSearchToolOptions = {}) {
  const driverModelId = options.driverModelId ?? DEFAULT_X_SEARCH_DRIVER_MODEL;
  const generate = options.generate ?? generateText;

  return defineTool({
    description: CLOUD_TOOL_META["x-search"].description,
    inputSchema: XSearchInputSchema,
    outputSchema: XSearchOutputSchema,
    async execute(input): Promise<XSearchOutput> {
      if (input.allowed_x_handles !== undefined && input.excluded_x_handles !== undefined) {
        throw new Error("Give allowed_x_handles or excluded_x_handles, not both. No search was run.");
      }
      // The xAI tool's empty-object input generic doesn't unify with ToolSet's
      // Tool variance under exactOptionalPropertyTypes; the assertion is
      // confined here — the factory is the AI SDK's own typed x_search tool.
      const tool = xaiTools.xSearch({
        ...(input.allowed_x_handles === undefined ? {} : { allowedXHandles: [...input.allowed_x_handles] }),
        ...(input.excluded_x_handles === undefined ? {} : { excludedXHandles: [...input.excluded_x_handles] }),
        ...(input.from_date === undefined ? {} : { fromDate: input.from_date }),
        ...(input.to_date === undefined ? {} : { toDate: input.to_date }),
        ...(input.enable_image_understanding === undefined ? {} : { enableImageUnderstanding: input.enable_image_understanding }),
        ...(input.enable_video_understanding === undefined ? {} : { enableVideoUnderstanding: input.enable_video_understanding }),
      }) as unknown as ToolSet[string];
      const lineage: SearchInvocationLineage = {
        operation: "search.x",
        concreteModelId: driverModelId,
        catalogSnapshotId: null,
        catalogStatus: "unavailable",
        adapterRevision: X_SEARCH_ADAPTER_REVISION,
        estimate: { confidence: "unknown" },
      };
      let driven: XSearchDriverResult;
      try {
        driven = await generate({
          model: zoGateway().languageModel(driverModelId),
          prompt: `Call the x_search tool exactly once for this query, verbatim, then stop: ${input.query}`,
          tools: { x_search: tool },
          toolChoice: { type: "tool", toolName: "x_search" },
          headers: { [ZO_TOOL_HEADER]: "x_search", ...mediaInvocationHeaders(lineage) },
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
        value: output.posts
          .map((post, index) => `${index + 1}. @${post.author} (${post.likes} likes)\n${post.url}\n${post.text}`)
          .join("\n\n"),
      };
    },
  });
}

function parsePosts(output: unknown): readonly XSearchOutput["posts"][number][] | null {
  if (!isRecord(output) || !Array.isArray(output.posts)) return null;
  const posts: XSearchOutput["posts"][number][] = [];
  for (const post of output.posts.slice(0, MAX_POSTS)) {
    if (!isRecord(post) || typeof post.author !== "string" || typeof post.text !== "string") continue;
    const url = parseSearchResultUrl(post.url);
    if (url === null) continue;
    posts.push({
      author: post.author,
      text: post.text.slice(0, MAX_POST_CHARS),
      url,
      likes: typeof post.likes === "number" && Number.isFinite(post.likes) ? post.likes : 0,
    });
  }
  return posts;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : "unknown error";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default xSearchTool();
