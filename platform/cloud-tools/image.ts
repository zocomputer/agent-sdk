import { randomUUID } from "node:crypto";

import { generateImage } from "ai";
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

export const DEFAULT_IMAGE_MODEL = "bfl/flux-2-pro";

type ImageSize = `${number}x${number}`;
type ImageAspectRatio = `${number}:${number}`;

function isImageSize(value: unknown): value is ImageSize {
  return (
    typeof value === "string" &&
    /^[1-9]\d{1,4}x[1-9]\d{1,4}$/u.test(value)
  );
}

function isImageAspectRatio(value: unknown): value is ImageAspectRatio {
  return (
    typeof value === "string" &&
    /^[1-9]\d{0,2}:[1-9]\d{0,2}$/u.test(value)
  );
}

// z.templateLiteral (never z.custom): eve converts tool input schemas to JSON Schema
// with zod's toJSONSchema, which throws on z.custom — an agent with this tool would
// fail to boot. templateLiteral emits a string+pattern schema and keeps the
// template-literal types; the refine keeps the stricter bounds the pattern alone
// can't express (runtime-only, invisible to JSON Schema).
const SizeSchema = z
  .templateLiteral([z.number().int().positive(), "x", z.number().int().positive()])
  .refine(isImageSize, { message: "Use WIDTHxHEIGHT, for example 1024x1024." });

const AspectRatioSchema = z
  .templateLiteral([z.number().int().positive(), ":", z.number().int().positive()])
  .refine(isImageAspectRatio, { message: "Use WIDTH:HEIGHT, for example 1:1 or 16:9." });

// Flat snake_case scalars, strip mode — the agent-sdk tool-schema contract
// (packages/agent-sdk/src/tools/AGENTS.md): no nested unions the model can
// garble, and an invented extra key strips instead of bouncing the whole call.
// `size`/`aspect_ratio` are mutually exclusive; the executor enforces that
// with corrective prose (a schema-level union would reintroduce the nesting).
export const GenerateImageInputSchema = z.object({
  aspect_ratio: AspectRatioSchema.optional().describe(
    "Aspect ratio as WIDTH:HEIGHT, e.g. '1:1' or '16:9'. Give this or `size`, not both.",
  ),
  model: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Image model id; omit to use the default."),
  output_dir: OutputDirSchema.optional().describe(
    "Relative state-file directory for the generated asset; defaults to 'generated'.",
  ),
  prompt: z.string().trim().min(1).max(4000).describe("What to generate."),
  seed: z.number().int().nonnegative().optional().describe("Reproducibility seed."),
  size: SizeSchema.optional().describe(
    "Exact pixel size as WIDTHxHEIGHT, e.g. '1024x1024'. Give this or `aspect_ratio`, not both.",
  ),
});

export const GenerateImageOutputSchema = GeneratedAssetOutputSchema;

export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

interface GeneratedImageResult {
  readonly image: {
    readonly mediaType: string;
    readonly uint8Array: Uint8Array;
  };
  readonly warnings: readonly unknown[];
}

export interface GenerateImageToolOptions {
  readonly assetWriter?: StateFilesAssetWriter;
  readonly declarationName?: string;
  readonly generate?: (options: Parameters<typeof generateImage>[0]) => Promise<GeneratedImageResult>;
  readonly randomId?: () => string;
}

function randomImageId(): string {
  return randomUUID().slice(0, 8);
}

export function generateImageTool(options: GenerateImageToolOptions = {}) {
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const assetWriter =
    options.assetWriter ?? createRuntimeStateFilesClient({ declarationName });
  const generate = options.generate ?? generateImage;
  const randomId = options.randomId ?? randomImageId;

  return defineTool({
    description: CLOUD_TOOL_META.image.description,
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
    async execute(input): Promise<GenerateImageOutput> {
      if (input.size !== undefined && input.aspect_ratio !== undefined) {
        throw new Error(
          "Give `size` or `aspect_ratio`, not both — no image was generated. " +
            "Resend with one of them (or neither, for the model's default framing).",
        );
      }
      const model = input.model ?? DEFAULT_IMAGE_MODEL;
      let result: GeneratedImageResult;
      try {
        result = await generate({
          headers: { [ZO_TOOL_HEADER]: "generate_image" },
          model: zoGateway().imageModel(model),
          prompt: input.prompt,
          ...(input.size === undefined ? {} : { size: input.size }),
          ...(input.aspect_ratio === undefined ? {} : { aspectRatio: input.aspect_ratio }),
          ...(input.seed === undefined ? {} : { seed: input.seed }),
        });
      } catch (error) {
        throw generationFailure("image", error);
      }
      const image = result.image;
      const path = assetOutputPath({
        id: randomId(),
        mediaType: image.mediaType,
        outputDir: input.output_dir,
        prompt: input.prompt,
        fallbackSlug: "image",
      });

      try {
        await assetWriter.write(path, image.uint8Array, { contentType: image.mediaType });
      } catch (error) {
        throw saveFailure("image", error);
      }
      const asset: StateAssetReference = stateAssetReference({
        type: "state_asset",
        declarationName,
        path,
        contentType: image.mediaType,
        bytes: image.uint8Array.byteLength,
      });

      return {
        asset,
        bytes: image.uint8Array.byteLength,
        mediaType: image.mediaType,
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
          `Generated image saved as state asset ${output.asset.declarationName}:${output.asset.path}. ` +
          `The asset is available to the chat UI through the state_asset reference; ` +
          `do not invent or expose a temporary URL.`,
      };
    },
  });
}

export default generateImageTool();
