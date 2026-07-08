import { randomUUID } from "node:crypto";

import { experimental_generateVideo as generateVideo } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { assetOutputPath, OutputDirSchema } from "./asset-path";
import { CLOUD_TOOL_META } from "./tool-meta";
import {
  createRuntimeStateFilesClient,
  DEFAULT_STATE_ASSET_DECLARATION_NAME,
  stateAssetReference,
  type StateAssetReference,
  type StateFilesAssetWriter,
} from "./state-files";

// A fast text-to-video model verified to generate a ~2 MB mp4 in ~2 min through the
// gateway — well under the proxy's 800s Fluid cap. Video generation is dollars-per-call
// and multi-minute, so keep the default conservative and let the model's own default
// (short) duration stand unless a caller opts into more.
export const DEFAULT_VIDEO_MODEL = "bytedance/seedance-2.0-fast";

// Common, provider-agnostic aspect ratios. Kept an explicit enum (not a free
// `${number}:${number}`) so the JSON Schema the model sees offers safe choices.
const AspectRatioSchema = z.enum(["16:9", "9:16", "1:1"]);

export const GenerateVideoInputSchema = z
  .object({
    aspectRatio: AspectRatioSchema.optional(),
    durationSeconds: z.number().int().positive().max(30).optional(),
    model: z.string().trim().min(1).optional(),
    outputDir: OutputDirSchema.optional(),
    prompt: z.string().trim().min(1).max(4000),
    seed: z.number().int().nonnegative().optional(),
  })
  .strict();

const StateAssetReferenceSchema = z
  .object({
    bytes: z.number().int().nonnegative().optional(),
    contentType: z.string().optional(),
    declarationName: z.string(),
    path: z.string(),
    type: z.literal("state_asset"),
  })
  .strict();

export const GenerateVideoOutputSchema = z
  .object({
    asset: StateAssetReferenceSchema,
    bytes: z.number().int().nonnegative(),
    mediaType: z.string(),
    model: z.string(),
    path: z.string(),
    prompt: z.string(),
    warnings: z.array(z.string()),
  })
  .strict();

export type GenerateVideoInput = z.infer<typeof GenerateVideoInputSchema>;
export type GenerateVideoOutput = z.infer<typeof GenerateVideoOutputSchema>;

interface GeneratedVideoResult {
  readonly video: {
    readonly mediaType: string;
    readonly uint8Array: Uint8Array;
  };
  readonly warnings: readonly unknown[];
}

export interface GenerateVideoToolOptions {
  readonly assetWriter?: StateFilesAssetWriter;
  readonly declarationName?: string;
  readonly generate?: (options: Parameters<typeof generateVideo>[0]) => Promise<GeneratedVideoResult>;
  readonly randomId?: () => string;
}

function warningText(warning: unknown): string {
  if (warning instanceof Error) {
    return warning.message;
  }
  if (typeof warning === "string") {
    return warning;
  }

  // The lib overload says `JSON.stringify` returns `string`, but it really
  // returns `undefined` for symbols/functions — widen it back.
  const json = JSON.stringify(warning) as string | undefined;
  return json ?? String(warning);
}

function randomVideoId(): string {
  return randomUUID().slice(0, 8);
}

export function generateVideoTool(options: GenerateVideoToolOptions = {}) {
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const assetWriter =
    options.assetWriter ?? createRuntimeStateFilesClient({ declarationName });
  const generate = options.generate ?? generateVideo;
  const randomId = options.randomId ?? randomVideoId;

  return defineTool({
    description: CLOUD_TOOL_META.video.description,
    inputSchema: GenerateVideoInputSchema,
    outputSchema: GenerateVideoOutputSchema,
    async execute(input): Promise<GenerateVideoOutput> {
      const model = input.model ?? DEFAULT_VIDEO_MODEL;
      const result = await generate({
        headers: { [ZO_TOOL_HEADER]: "generate_video" },
        model: zoGateway().video(model),
        prompt: input.prompt,
        ...(input.aspectRatio === undefined ? {} : { aspectRatio: input.aspectRatio }),
        ...(input.durationSeconds === undefined ? {} : { duration: input.durationSeconds }),
        ...(input.seed === undefined ? {} : { seed: input.seed }),
      });
      const video = result.video;
      const path = assetOutputPath({
        id: randomId(),
        mediaType: video.mediaType,
        outputDir: input.outputDir,
        prompt: input.prompt,
        fallbackSlug: "video",
      });

      await assetWriter.write(path, video.uint8Array, { contentType: video.mediaType });
      const asset: StateAssetReference = stateAssetReference({
        type: "state_asset",
        declarationName,
        path,
        contentType: video.mediaType,
        bytes: video.uint8Array.byteLength,
      });

      return {
        asset,
        bytes: video.uint8Array.byteLength,
        mediaType: video.mediaType,
        model,
        path,
        prompt: input.prompt,
        warnings: result.warnings.map(warningText),
      };
    },
    toModelOutput(output) {
      return {
        type: "text",
        value:
          `Generated video saved as state asset ${output.asset.declarationName}:${output.asset.path}. ` +
          `The asset is available to the chat UI through the state_asset reference; ` +
          `do not invent or expose a temporary URL.`,
      };
    },
  });
}

export default generateVideoTool();
