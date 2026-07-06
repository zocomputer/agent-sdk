import { randomUUID } from "node:crypto";

import { generateImage } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { imageOutputPath } from "./image-path";
import { CLOUD_TOOL_META } from "./tool-meta";
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

const ImageDimensionsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("auto") }).strict(),
  z.object({ kind: z.literal("size"), size: SizeSchema }).strict(),
  z
    .object({
      aspectRatio: AspectRatioSchema,
      kind: z.literal("aspectRatio"),
    })
    .strict(),
]);

const OutputDirSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(
    /^(?!\/)(?!.*\/$)(?!.*\/\/)(?!.*(?:^|\/)(?:\.|\.\.)(?:\/|$))[A-Za-z0-9._/-]+$/u,
    "Use a relative state file path without empty, . or .. segments.",
  );

export const GenerateImageInputSchema = z
  .object({
    dimensions: ImageDimensionsSchema.optional(),
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

export const GenerateImageOutputSchema = z
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

export type GenerateImageDimensions = z.infer<typeof ImageDimensionsSchema>;
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

interface ImageDimensionSettings {
  readonly aspectRatio?: ImageAspectRatio;
  readonly size?: ImageSize;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled generate_image dimensions: ${JSON.stringify(value)}`);
}

function imageDimensionSettings(
  dimensions: GenerateImageDimensions | undefined,
): ImageDimensionSettings {
  if (dimensions === undefined || dimensions.kind === "auto") {
    return {};
  }

  switch (dimensions.kind) {
    case "aspectRatio":
      return { aspectRatio: dimensions.aspectRatio };
    case "size":
      return { size: dimensions.size };
    default:
      return assertNever(dimensions);
  }
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
      const model = input.model ?? DEFAULT_IMAGE_MODEL;
      const result = await generate({
        headers: { [ZO_TOOL_HEADER]: "generate_image" },
        model: zoGateway().imageModel(model),
        prompt: input.prompt,
        ...imageDimensionSettings(input.dimensions),
        ...(input.seed === undefined ? {} : { seed: input.seed }),
      });
      const image = result.image;
      const path = imageOutputPath({
        id: randomId(),
        mediaType: image.mediaType,
        outputDir: input.outputDir,
        prompt: input.prompt,
      });

      await assetWriter.write(path, image.uint8Array, { contentType: image.mediaType });
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
