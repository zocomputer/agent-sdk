import { randomUUID } from "node:crypto";

import { experimental_generateVideo as generateVideo } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { assetOutputPath, OutputDirSchema } from "./asset-path";
import type {
  MediaCorrection,
  MediaPreflight,
  MediaPreflightSuccess,
} from "./media-contracts";
import { mappedMediaInput, normalizedMappedCall } from "./image-lane";
import { mediaInvocationHeaders } from "./media-lineage";
import { CLOUD_TOOL_META } from "./tool-meta";
import {
  GeneratedAssetOutputSchema,
  generationFailure,
  saveFailure,
  warningText,
} from "./tool-shared";
import {
  createRuntimeStateFilesClient,
  type StateAssetReference,
  type StateFilesAssetStore,
  type StateFilesAssetWriter,
} from "./state-files";
import { createVideoPreflight } from "./video-lane";

export const DEFAULT_VIDEO_MODEL = "bytedance/seedance-2.0-fast";
export const DEFAULT_VIDEO_DOWNLOAD_MAX_BYTES = 256 * 1024 * 1024;
export const DEFAULT_VIDEO_TIMEOUT_MS = 8 * 60 * 1000;

const AspectRatioSchema = z.enum(["16:9", "9:16", "1:1"]);
const ResolutionSchema = z.enum(["480x854", "854x480", "720x1280", "1280x720", "1080x1920", "1920x1080"]);
const AssetScalarSchema = z.string().trim().startsWith("files:");

export const GenerateVideoInputSchema = z.object({
  aspect_ratio: AspectRatioSchema.optional(),
  duration_seconds: z.number().int().positive().max(30).optional(),
  end_frame_asset: AssetScalarSchema.optional(),
  fps: z.number().int().min(1).max(60).optional(),
  generate_audio: z.boolean().optional(),
  model: z.string().trim().min(1).optional(),
  output_dir: OutputDirSchema.optional(),
  prompt: z.string().trim().min(1).max(4000),
  reference_asset: AssetScalarSchema.optional(),
  resolution: ResolutionSchema.optional(),
  seed: z.number().int().nonnegative().optional(),
  start_frame_asset: AssetScalarSchema.optional(),
});

export const GenerateVideoOutputSchema = GeneratedAssetOutputSchema;
export type GenerateVideoInput = z.infer<typeof GenerateVideoInputSchema>;
export type GenerateVideoOutput = z.infer<typeof GenerateVideoOutputSchema>;

interface GeneratedVideoResult {
  readonly video: { readonly mediaType: string; readonly uint8Array: Uint8Array };
  readonly warnings: readonly unknown[];
}

type GenerateCall = Parameters<typeof generateVideo>[0];

export interface GenerateVideoToolOptions {
  readonly assetWriter?: StateFilesAssetWriter;
  readonly assetStore?: StateFilesAssetStore;
  /** @deprecated The writer owns the canonical declaration name. */
  readonly declarationName?: string;
  readonly preflight?: MediaPreflight;
  readonly generate?: (options: GenerateCall) => Promise<GeneratedVideoResult>;
  readonly randomId?: () => string;
  readonly timeoutMs?: number;
  readonly download?: GenerateCall["download"];
}

export function generateVideoTool(options: GenerateVideoToolOptions = {}) {
  const runtimeStore = options.assetStore ?? createRuntimeStateFilesClient();
  const assetWriter = options.assetWriter ?? runtimeStore;
  const preflight = options.preflight ?? createVideoPreflight({ assetStore: runtimeStore, defaultModel: DEFAULT_VIDEO_MODEL });
  const generate = options.generate ?? generateVideo;
  const randomId = options.randomId ?? (() => randomUUID().slice(0, 8));

  return defineTool({
    description: CLOUD_TOOL_META.video.description,
    inputSchema: GenerateVideoInputSchema,
    outputSchema: GenerateVideoOutputSchema,
    async execute(input): Promise<GenerateVideoOutput> {
      const modeError = validateGenerationMode(input);
      if (modeError !== null) throw correctionError(modeError);
      const checked = await runPreflight(preflight, "video.generate", input);
      const mapped = normalizedMappedCall(checked.mappedCall, input);
      const start = mappedMediaInput(mapped, "start_frame");
      const end = mappedMediaInput(mapped, "end_frame");
      const reference = mappedMediaInput(mapped, "reference");
      const promptText = mapped.input.prompt;
      if (typeof promptText !== "string") throw new Error("Media adapter omitted prompt; no provider request was made.");
      const prompt = start !== undefined && end === undefined
        ? { image: start.body, text: promptText }
        : promptText;
      const frameImages = start !== undefined && end !== undefined
        ? [{ image: start.body, frameType: "first_frame" as const }, { image: end.body, frameType: "last_frame" as const }]
        : undefined;

      let result: GeneratedVideoResult;
      try {
        result = await generate({
          headers: { [ZO_TOOL_HEADER]: "generate_video", ...mediaInvocationHeaders(checked.lineage) },
          model: zoGateway().video(checked.lineage.concreteModelId),
          prompt,
          abortSignal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_VIDEO_TIMEOUT_MS),
          download: options.download ?? createBoundedVideoDownload({ timeoutMs: options.timeoutMs ?? DEFAULT_VIDEO_TIMEOUT_MS }),
          ...mappedVideoSettings(mapped.settings),
          ...(Object.keys(mapped.providerOptions).length === 0 ? {} : { providerOptions: mapped.providerOptions }),
          ...(frameImages === undefined ? {} : { frameImages }),
          ...(reference === undefined ? {} : { inputReferences: [reference.body] }),
        });
      } catch (error) {
        throw generationFailure("video", error);
      }
      return persistVideo({ assetWriter, input, model: checked.lineage.concreteModelId, randomId, result });
    },
    toModelOutput: videoModelOutput,
  });
}

export function createBoundedVideoDownload(options: {
  readonly fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  readonly maxBytes?: number;
  readonly timeoutMs?: number;
} = {}): NonNullable<GenerateCall["download"]> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const maxBytes = options.maxBytes ?? DEFAULT_VIDEO_DOWNLOAD_MAX_BYTES;
  return async ({ url, abortSignal }) => {
    if (url.protocol !== "https:") throw new Error("video output download requires HTTPS");
    const response = await fetchImpl(url, {
      signal: abortSignal ?? AbortSignal.timeout(options.timeoutMs ?? DEFAULT_VIDEO_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`video output download failed with HTTP ${response.status}`);
    const declaredBytes = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new Error(`video output exceeds the ${maxBytes}-byte download limit`);
    }
    const data = await readBoundedResponse(response, maxBytes);
    return { data, mediaType: response.headers.get("content-type") ?? undefined };
  };
}

function validateGenerationMode(input: GenerateVideoInput): MediaCorrection | null {
  if (input.end_frame_asset !== undefined && input.start_frame_asset === undefined) {
    return { code: "asset_invalid", message: "end_frame_asset requires start_frame_asset." };
  }
  if (input.reference_asset !== undefined && (input.start_frame_asset !== undefined || input.end_frame_asset !== undefined)) {
    return { code: "asset_invalid", message: "reference_asset cannot be combined with start/end frame assets." };
  }
  return null;
}

async function runPreflight<TOperation extends "video.generate" | "video.edit">(
  preflight: MediaPreflight | undefined,
  operation: TOperation,
  input: unknown,
): Promise<MediaPreflightSuccess<TOperation>> {
  if (preflight === undefined) {
    throw correctionError({ code: "catalog_unavailable", message: "Media preflight is not configured; no provider request was made." });
  }
  const explicitModel = typeof input === "object" && input !== null && "model" in input && typeof input.model === "string";
  const result = await preflight.run({ operation, input, catalogPolicy: explicitModel ? "fresh" : "allow_stale" });
  if (!result.ok) throw correctionError(result.error);
  return result.value;
}

async function readBoundedResponse(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (response.body === null) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      if (!(part.value instanceof Uint8Array)) throw new Error("video output returned a malformed byte stream");
      const chunk = part.value;
      total += chunk.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`video output exceeds the ${maxBytes}-byte download limit`);
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output;
}

function mappedVideoSettings(settings: Readonly<Record<string, string | number | boolean>>) {
  const aspectRatio = optionalString(settings, "aspect_ratio");
  const duration = optionalNumber(settings, "duration_seconds");
  const fps = optionalNumber(settings, "fps");
  const generateAudio = optionalBoolean(settings, "generate_audio");
  const resolution = optionalString(settings, "resolution");
  const seed = optionalNumber(settings, "seed");
  if (aspectRatio !== undefined && !isAspectRatio(aspectRatio)) throw new Error("Media adapter returned invalid aspect_ratio; no provider request was made.");
  if (resolution !== undefined && !isResolution(resolution)) throw new Error("Media adapter returned invalid resolution; no provider request was made.");
  return { ...(aspectRatio === undefined ? {} : { aspectRatio }), ...(duration === undefined ? {} : { duration }), ...(fps === undefined ? {} : { fps }), ...(generateAudio === undefined ? {} : { generateAudio }), ...(resolution === undefined ? {} : { resolution }), ...(seed === undefined ? {} : { seed }) };
}

function optionalString(record: Readonly<Record<string, unknown>>, name: string): string | undefined { const value = record[name]; if (value === undefined) return undefined; if (typeof value !== "string") throw new Error(`Media adapter returned invalid ${name}; no provider request was made.`); return value; }
function optionalNumber(record: Readonly<Record<string, unknown>>, name: string): number | undefined { const value = record[name]; if (value === undefined) return undefined; if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Media adapter returned invalid ${name}; no provider request was made.`); return value; }
function optionalBoolean(record: Readonly<Record<string, unknown>>, name: string): boolean | undefined { const value = record[name]; if (value === undefined) return undefined; if (typeof value !== "boolean") throw new Error(`Media adapter returned invalid ${name}; no provider request was made.`); return value; }
function isAspectRatio(value: string): value is `${number}:${number}` { return /^\d+:\d+$/u.test(value); }
function isResolution(value: string): value is `${number}x${number}` { return /^\d+x\d+$/u.test(value); }

async function persistVideo(options: {
  readonly assetWriter: StateFilesAssetWriter;
  readonly input: Pick<GenerateVideoInput, "output_dir" | "prompt">;
  readonly model: string;
  readonly randomId: () => string;
  readonly result: GeneratedVideoResult;
}): Promise<GenerateVideoOutput> {
  const video = options.result.video;
  const path = assetOutputPath({ id: options.randomId(), mediaType: video.mediaType, outputDir: options.input.output_dir, prompt: options.input.prompt, fallbackSlug: "video" });
  let asset: StateAssetReference;
  try {
    asset = await options.assetWriter.write(path, video.uint8Array, { contentType: video.mediaType });
  } catch (error) {
    throw saveFailure("video", error);
  }
  return { asset, bytes: video.uint8Array.byteLength, mediaType: video.mediaType, model: options.model, path, prompt: options.input.prompt, warnings: options.result.warnings.map(warningText) };
}

function correctionError(correction: MediaCorrection): Error {
  return new Error(`${correction.code}: ${correction.message}`);
}

function videoModelOutput(output: GenerateVideoOutput) {
  return { type: "text" as const, value: `Generated video saved as state asset ${output.asset.declarationName}:${output.asset.path}. Pass files:${output.asset.path} to another media tool; no temporary URL is exposed.` };
}

export default generateVideoTool();
