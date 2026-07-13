import { experimental_generateVideo as generateVideo } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { OutputDirSchema } from "./asset-path";
import type { MediaAssetRef, MediaPreflight } from "./media-contracts";
import { mappedMediaInput, normalizedMappedCall } from "./image-lane";
import { mediaInvocationHeaders } from "./media-lineage";
import { createProviderMediaInputResolver, type ProviderMediaInput } from "./provider-media-input";
import { GeneratedAssetOutputSchema, generationFailure, saveFailure, warningText } from "./tool-shared";
import { createRuntimeStateFilesClient, type StateFilesAssetStore, type StateFilesAssetWriter } from "./state-files";
import { createBoundedVideoDownload, DEFAULT_VIDEO_DOWNLOAD_MAX_BYTES, DEFAULT_VIDEO_TIMEOUT_MS } from "./video";
import { createVideoPreflight } from "./video-lane";
import { assetOutputPath } from "./asset-path";
import { randomUUID } from "node:crypto";

export const DEFAULT_VIDEO_EDIT_MODEL = "xai/grok-imagine-video";
const AssetScalarSchema = z.string().trim().startsWith("files:");

export const EditVideoInputSchema = z.object({
  input_asset: AssetScalarSchema,
  model: z.string().trim().min(1).optional(),
  output_dir: OutputDirSchema.optional(),
  prompt: z.string().trim().min(1).max(4000),
});
export const EditVideoOutputSchema = GeneratedAssetOutputSchema;
export type EditVideoInput = z.infer<typeof EditVideoInputSchema>;
export type EditVideoOutput = z.infer<typeof EditVideoOutputSchema>;

type GenerateCall = Parameters<typeof generateVideo>[0];
interface GeneratedVideoResult { readonly video: { readonly mediaType: string; readonly uint8Array: Uint8Array }; readonly warnings: readonly unknown[] }

export interface EditVideoToolOptions {
  readonly assetWriter?: StateFilesAssetWriter;
  readonly assetStore?: StateFilesAssetStore;
  readonly preflight?: MediaPreflight;
  readonly resolveProviderInput?: (request: { readonly ref: MediaAssetRef; readonly delivery: "url"; readonly maxBytes: number; readonly acceptedKinds: readonly ["video"]; readonly urlExpiresInSeconds: number }) => Promise<ProviderMediaInput>;
  readonly generate?: (options: GenerateCall) => Promise<GeneratedVideoResult>;
  readonly randomId?: () => string;
  readonly timeoutMs?: number;
  readonly download?: GenerateCall["download"];
}

export function editVideoTool(options: EditVideoToolOptions = {}) {
  const runtimeStore = options.assetStore ?? createRuntimeStateFilesClient();
  const writer = options.assetWriter ?? runtimeStore;
  const preflight = options.preflight ?? createVideoPreflight({ assetStore: runtimeStore, defaultModel: DEFAULT_VIDEO_EDIT_MODEL });
  const resolveProviderInput = options.resolveProviderInput ?? createProviderMediaInputResolver({
    read: runtimeStore.read.bind(runtimeStore),
    resolveUrl: async (ref, expiresInSeconds) => {
      if (runtimeStore.resolveUrl === undefined) {
        throw new Error("trusted URL delivery is unavailable");
      }
      return runtimeStore.resolveUrl(ref, expiresInSeconds);
    },
  });
  return defineTool({
    description: "Edit a durable video asset with a supported video model. Call media_models before choosing a model.",
    inputSchema: EditVideoInputSchema,
    outputSchema: EditVideoOutputSchema,
    async execute(input): Promise<EditVideoOutput> {
      const checked = await preflight.run({ operation: "video.edit", input, catalogPolicy: input.model === undefined ? "allow_stale" : "fresh" });
      if (!checked.ok) throw new Error(`${checked.error.code}: ${checked.error.message}`);
      const mapped = normalizedMappedCall(checked.value.mappedCall, input);
      const sourceAsset = mappedMediaInput(mapped, "source");
      if (sourceAsset === undefined) throw new Error("asset_invalid: adapter omitted the source video; no provider request was made.");
      const prompt = mapped.input.prompt;
      if (typeof prompt !== "string") throw new Error("setting_unsupported: adapter omitted prompt; no provider request was made.");
      const source = await resolveProviderInput({ ref: sourceAsset.ref, delivery: "url", maxBytes: DEFAULT_VIDEO_DOWNLOAD_MAX_BYTES, acceptedKinds: ["video"], urlExpiresInSeconds: Math.ceil((options.timeoutMs ?? DEFAULT_VIDEO_TIMEOUT_MS) / 1000) + 60 });
      if (source.delivery !== "url") throw new Error("asset_invalid: Video edit provider requires trusted URL delivery.");
      let result: GeneratedVideoResult;
      try {
        result = await (options.generate ?? generateVideo)({
          abortSignal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_VIDEO_TIMEOUT_MS),
          download: options.download ?? createBoundedVideoDownload(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
          headers: { [ZO_TOOL_HEADER]: "edit_video", ...mediaInvocationHeaders(checked.value.lineage) },
          model: zoGateway().video(checked.value.lineage.concreteModelId),
          prompt,
          providerOptions: { ...mapped.providerOptions, xai: { ...mapped.providerOptions.xai, videoUrl: source.url.toString() } },
        });
      } catch (error) {
        throw generationFailure("video", error);
      }
      const video = result.video;
      const path = assetOutputPath({ id: (options.randomId ?? (() => randomUUID().slice(0, 8)))(), mediaType: video.mediaType, outputDir: input.output_dir, prompt: input.prompt, fallbackSlug: "video-edit" });
      let asset: MediaAssetRef;
      try { asset = await writer.write(path, video.uint8Array, { contentType: video.mediaType }); }
      catch (error) { throw saveFailure("video", error); }
      return { asset, bytes: video.uint8Array.byteLength, mediaType: video.mediaType, model: checked.value.lineage.concreteModelId, path, prompt: input.prompt, warnings: result.warnings.map(warningText) };
    },
    toModelOutput(output) { return { type: "text", value: `Edited video saved as state asset ${output.asset.declarationName}:${output.asset.path}. Pass files:${output.asset.path} to another media tool; no temporary URL is exposed.` }; },
  });
}

export default editVideoTool();
