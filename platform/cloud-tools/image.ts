import { randomUUID } from "node:crypto";

import { generateImage } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { assetOutputPath, OutputDirSchema } from "./asset-path";
import type { MediaPreflight } from "./media-contracts";
import type { MediaRegistry } from "./media-registry";
import { formatMediaAssetRef } from "./media-asset";
import {
  correctionError,
  createImagePreflight,
  mappedMediaInput,
  normalizedMappedCall,
} from "./image-lane";
import { mediaInvocationHeaders } from "./media-lineage";
import { CLOUD_TOOL_META } from "./tool-meta";
import { StateAssetReferenceSchema, generationFailure, saveFailure, warningText } from "./tool-shared";
import {
  createRuntimeStateFilesClient,
  DEFAULT_STATE_ASSET_DECLARATION_NAME,
  type StateFilesAssetStore,
} from "./state-files";

export const DEFAULT_IMAGE_MODEL = "bfl/flux-2-pro";

const SizeSchema = z
  .templateLiteral([z.number().int(), "x", z.number().int()])
  .refine((value) => /^[1-9]\d*x[1-9]\d*$/u.test(value), "size dimensions must be positive integers");
const AspectRatioSchema = z
  .templateLiteral([z.number().int(), ":", z.number().int()])
  .refine((value) => /^[1-9]\d*:[1-9]\d*$/u.test(value), "aspect ratio terms must be positive integers");

export const GenerateImageInputSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  model: z.string().trim().min(1).optional(),
  reference_asset: z.string().trim().startsWith("files:").optional(),
  size: SizeSchema.optional(),
  aspect_ratio: AspectRatioSchema.optional(),
  count: z.number().int().min(1).max(4).optional(),
  seed: z.number().int().nonnegative().optional(),
  safety: z.enum(["strict", "standard", "relaxed"]).optional().describe("Content moderation strictness, when the model supports it."),
  output_dir: OutputDirSchema.optional(),
});

export const GenerateImageOutputSchema = z.object({
  assets: z.array(StateAssetReferenceSchema).min(1),
  model: z.string(),
  prompt: z.string(),
  warnings: z.array(z.string()),
});

export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

interface GeneratedImageResult {
  readonly image: { readonly mediaType: string; readonly uint8Array: Uint8Array };
  readonly images?: readonly { readonly mediaType: string; readonly uint8Array: Uint8Array }[];
  readonly warnings: readonly unknown[];
}

export interface GenerateImageToolOptions {
  readonly assetStore?: StateFilesAssetStore;
  readonly declarationName?: string;
  readonly preflight?: MediaPreflight;
  readonly registry?: () => Promise<import("./media-contracts").MediaResult<MediaRegistry, string>>;
  readonly generate?: (options: Parameters<typeof generateImage>[0]) => Promise<GeneratedImageResult>;
  readonly randomId?: () => string;
}

export function generateImageTool(options: GenerateImageToolOptions = {}) {
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const assetStore = options.assetStore ?? createRuntimeStateFilesClient({ declarationName });
  const preflight = options.preflight ?? createImagePreflight({ operation: "image.generate", assetStore, defaultModel: DEFAULT_IMAGE_MODEL, ...(options.registry === undefined ? {} : { registry: options.registry }) });
  const generate = options.generate ?? generateImage;
  const randomId = options.randomId ?? (() => randomUUID().slice(0, 8));

  return defineTool({
    description: CLOUD_TOOL_META.image.description,
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
    async execute(input): Promise<GenerateImageOutput> {
      if (input.size !== undefined && input.aspect_ratio !== undefined) {
        throw new Error("Give size or aspect_ratio, not both. No provider call was made.");
      }
      const checked = await preflight.run({ operation: "image.generate", input, catalogPolicy: input.model === undefined ? "allow_stale" : "fresh" });
      if (!checked.ok) throw correctionError(checked);
      const mapped = normalizedMappedCall(checked.value.mappedCall, input);
      const reference = mappedMediaInput(mapped, "reference");
      const prompt = readMappedString(mapped.input, "prompt");
      const count = readMappedNumber(mapped.settings, "count") ?? 1;
      const size = readOptionalMappedString(mapped.settings, "size");
      const aspectRatio = readOptionalMappedString(mapped.settings, "aspect_ratio");
      const seed = readMappedNumber(mapped.settings, "seed");
      if (size !== undefined && !isSize(size)) throw new Error("The media adapter returned invalid size; no provider request was made.");
      if (aspectRatio !== undefined && !isAspectRatio(aspectRatio)) throw new Error("The media adapter returned invalid aspect_ratio; no provider request was made.");
      let result: GeneratedImageResult;
      try {
        result = await generate({
          model: zoGateway().imageModel(checked.value.lineage.concreteModelId),
          prompt: reference === undefined ? prompt : { text: prompt, images: [reference.body] },
          n: count,
          ...(size === undefined ? {} : { size }),
          ...(aspectRatio === undefined ? {} : { aspectRatio }),
          ...(seed === undefined ? {} : { seed }),
          ...(Object.keys(mapped.providerOptions).length === 0 ? {} : { providerOptions: mapped.providerOptions }),
          headers: {
            [ZO_TOOL_HEADER]: "generate_image",
            ...mediaInvocationHeaders(checked.value.lineage),
          },
        });
      } catch (error) {
        throw generationFailure("image", error);
      }
      const generated = result.images?.length ? result.images : [result.image];
      const assets = [];
      for (const image of generated) {
        const path = assetOutputPath({ id: randomId(), mediaType: image.mediaType, outputDir: input.output_dir, prompt: input.prompt, fallbackSlug: "image" });
        try {
          assets.push(await assetStore.write(path, image.uint8Array, { contentType: image.mediaType }));
        } catch (error) {
          throw saveFailure("image", error);
        }
      }
      return { assets, model: checked.value.lineage.concreteModelId, prompt: input.prompt, warnings: result.warnings.map(warningText) };
    },
    toModelOutput(output) {
      return {
        type: "text",
        value: `Generated ${output.assets.length} image asset(s): ${output.assets
          .map((asset) => formatMediaAssetRef({
            type: "state_asset",
            declarationName: asset.declarationName,
            path: asset.path,
            ...(asset.contentType === undefined ? {} : { contentType: asset.contentType }),
            ...(asset.bytes === undefined ? {} : { bytes: asset.bytes }),
          }, declarationName))
          .join(", ")}.`,
      };
    },
  });
}

function readMappedString(record: Readonly<Record<string, unknown>>, name: string): string {
  const value = record[name];
  if (typeof value !== "string") throw new Error(`The media adapter omitted ${name}; no provider call was made.`);
  return value;
}

function readOptionalMappedString(record: Readonly<Record<string, unknown>>, name: string): string | undefined {
  const value = record[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`The media adapter returned invalid ${name}; no provider call was made.`);
  return value;
}

function readMappedNumber(record: Readonly<Record<string, unknown>>, name: string): number | undefined {
  const value = record[name];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`The media adapter returned invalid ${name}; no provider call was made.`);
  return value;
}

export default generateImageTool();

function isSize(value: string): value is `${number}x${number}` { return /^[1-9]\d*x[1-9]\d*$/u.test(value); }
function isAspectRatio(value: string): value is `${number}:${number}` { return /^[1-9]\d*:[1-9]\d*$/u.test(value); }
