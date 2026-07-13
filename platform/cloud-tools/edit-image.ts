import { randomUUID } from "node:crypto";

import { generateImage } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { assetOutputPath, OutputDirSchema } from "./asset-path";
import type { MediaPreflight } from "./media-contracts";
import type { MediaRegistry } from "./media-registry";
import { formatMediaAssetRef } from "./media-asset";
import { correctionError, createImagePreflight, mappedMediaInput, normalizedMappedCall } from "./image-lane";
import { mediaInvocationHeaders } from "./media-lineage";
import { StateAssetReferenceSchema, generationFailure, saveFailure, warningText } from "./tool-shared";
import { createRuntimeStateFilesClient, DEFAULT_STATE_ASSET_DECLARATION_NAME, type StateFilesAssetStore } from "./state-files";

export const DEFAULT_IMAGE_EDIT_MODEL = "bfl/flux-kontext-pro";
const AspectRatioSchema = z.templateLiteral([z.number().int().positive(), ":", z.number().int().positive()]);

export const EditImageInputSchema = z.object({
  input_asset: z.string().trim().startsWith("files:"),
  prompt: z.string().trim().min(1).max(4000),
  model: z.string().trim().min(1).optional(),
  mask_asset: z.string().trim().startsWith("files:").optional(),
  reference_asset: z.string().trim().startsWith("files:").optional(),
  aspect_ratio: AspectRatioSchema.optional(),
  safety: z.enum(["strict", "standard", "relaxed"]).optional().describe("Content moderation strictness, when the model supports it."),
  output_dir: OutputDirSchema.optional(),
});

export const EditImageOutputSchema = z.object({ asset: StateAssetReferenceSchema, model: z.string(), prompt: z.string(), warnings: z.array(z.string()) });
export type EditImageInput = z.infer<typeof EditImageInputSchema>;
export type EditImageOutput = z.infer<typeof EditImageOutputSchema>;

interface EditResult { readonly image: { readonly mediaType: string; readonly uint8Array: Uint8Array }; readonly warnings: readonly unknown[] }

export interface EditImageToolOptions {
  readonly assetStore?: StateFilesAssetStore;
  readonly declarationName?: string;
  readonly preflight?: MediaPreflight;
  readonly registry?: () => Promise<import("./media-contracts").MediaResult<MediaRegistry, string>>;
  readonly generate?: (options: Parameters<typeof generateImage>[0]) => Promise<EditResult>;
  readonly randomId?: () => string;
}

export function editImageTool(options: EditImageToolOptions = {}) {
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const assetStore = options.assetStore ?? createRuntimeStateFilesClient({ declarationName });
  const preflight = options.preflight ?? createImagePreflight({ operation: "image.edit", assetStore, defaultModel: DEFAULT_IMAGE_EDIT_MODEL, ...(options.registry === undefined ? {} : { registry: options.registry }) });
  const generate = options.generate ?? generateImage;
  const randomId = options.randomId ?? (() => randomUUID().slice(0, 8));
  return defineTool({
    description: "Edit a durable image asset with a capability-verified image model and save the result as a new asset.",
    inputSchema: EditImageInputSchema,
    outputSchema: EditImageOutputSchema,
    async execute(input): Promise<EditImageOutput> {
      const checked = await preflight.run({ operation: "image.edit", input, catalogPolicy: input.model === undefined ? "allow_stale" : "fresh" });
      if (!checked.ok) throw correctionError(checked);
      const mapped = normalizedMappedCall(checked.value.mappedCall, input);
      const source = mappedMediaInput(mapped, "source");
      if (source === undefined) throw new Error("Editing requires input_asset. No provider call was made.");
      const mask = mappedMediaInput(mapped, "mask");
      const reference = mappedMediaInput(mapped, "reference");
      const prompt = mapped.input.prompt;
      if (typeof prompt !== "string") throw new Error("The media adapter omitted prompt; no provider call was made.");
      const aspectRatio = mapped.settings.aspect_ratio;
      if (aspectRatio !== undefined && typeof aspectRatio !== "string") throw new Error("The media adapter returned invalid aspect_ratio; no provider call was made.");
      if (aspectRatio !== undefined && !isAspectRatio(aspectRatio)) throw new Error("The media adapter returned invalid aspect_ratio; no provider call was made.");
      let result: EditResult;
      try {
        result = await generate({
          model: zoGateway().imageModel(checked.value.lineage.concreteModelId),
          prompt: {
            text: prompt,
            images: reference === undefined ? [source.body] : [source.body, reference.body],
            ...(mask === undefined ? {} : { mask: mask.body }),
          },
          ...(aspectRatio === undefined ? {} : { aspectRatio }),
          ...(Object.keys(mapped.providerOptions).length === 0 ? {} : { providerOptions: mapped.providerOptions }),
          headers: { [ZO_TOOL_HEADER]: "edit_image", ...mediaInvocationHeaders(checked.value.lineage) },
        });
      } catch (error) {
        throw generationFailure("image", error);
      }
      const path = assetOutputPath({ id: randomId(), mediaType: result.image.mediaType, outputDir: input.output_dir, prompt: input.prompt, fallbackSlug: "edited-image" });
      let asset;
      try {
        asset = await assetStore.write(path, result.image.uint8Array, { contentType: result.image.mediaType });
      } catch (error) {
        throw saveFailure("image", error);
      }
      return { asset, model: checked.value.lineage.concreteModelId, prompt: input.prompt, warnings: result.warnings.map(warningText) };
    },
    toModelOutput(output) {
      const asset = {
        type: "state_asset" as const,
        declarationName: output.asset.declarationName,
        path: output.asset.path,
        ...(output.asset.contentType === undefined ? {} : { contentType: output.asset.contentType }),
        ...(output.asset.bytes === undefined ? {} : { bytes: output.asset.bytes }),
      };
      return { type: "text", value: `Edited image saved as ${formatMediaAssetRef(asset, declarationName)}.` };
    },
  });
}

export default editImageTool();

function isAspectRatio(value: string): value is `${number}:${number}` { return /^[1-9]\d*:[1-9]\d*$/u.test(value); }
