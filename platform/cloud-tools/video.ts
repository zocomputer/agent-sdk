import { randomUUID } from "node:crypto";

import { experimental_generateVideo as generateVideo } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { assetOutputPath, OutputDirSchema } from "./asset-path";
import { CLOUD_TOOL_META } from "./tool-meta";
import {
  GeneratedAssetOutputSchema,
  generationFailure,
  saveFailure,
  warningText,
} from "./tool-shared";
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

// Flat snake_case scalars, strip mode — the agent-sdk tool-schema contract
// (packages/agent-sdk/src/tools/AGENTS.md): an invented extra key strips
// instead of bouncing a dollars-per-call generation back as a Zod error.
export const GenerateVideoInputSchema = z.object({
  aspect_ratio: AspectRatioSchema.optional().describe(
    "Aspect ratio; omit for the model's default.",
  ),
  duration_seconds: z
    .number()
    .int()
    .positive()
    .max(30)
    .optional()
    .describe("Clip length in seconds (max 30); omit for the model's short default."),
  model: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Video model id; omit to use the default."),
  output_dir: OutputDirSchema.optional().describe(
    "Relative state-file directory for the generated asset; defaults to 'generated'.",
  ),
  prompt: z.string().trim().min(1).max(4000).describe("What to generate."),
  seed: z.number().int().nonnegative().optional().describe("Reproducibility seed."),
});

export const GenerateVideoOutputSchema = GeneratedAssetOutputSchema;

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
      let result: GeneratedVideoResult;
      try {
        result = await generate({
          headers: { [ZO_TOOL_HEADER]: "generate_video" },
          model: zoGateway().video(model),
          prompt: input.prompt,
          ...(input.aspect_ratio === undefined ? {} : { aspectRatio: input.aspect_ratio }),
          ...(input.duration_seconds === undefined ? {} : { duration: input.duration_seconds }),
          ...(input.seed === undefined ? {} : { seed: input.seed }),
        });
      } catch (error) {
        throw generationFailure("video", error);
      }
      const video = result.video;
      const path = assetOutputPath({
        id: randomId(),
        mediaType: video.mediaType,
        outputDir: input.output_dir,
        prompt: input.prompt,
        fallbackSlug: "video",
      });

      try {
        await assetWriter.write(path, video.uint8Array, { contentType: video.mediaType });
      } catch (error) {
        throw saveFailure("video", error);
      }
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
