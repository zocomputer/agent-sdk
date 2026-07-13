import type { MediaAssetRef, MediaCorrection, MediaCostEstimate, MediaInvocationLineage, MediaResult, ResolvedMediaAsset } from "./media-contracts";
import { parseMediaAssetRef } from "./media-asset";
import { defaultMediaRegistry } from "./media-models-default";
import { createMediaPreflight } from "./media-preflight";
import type { MediaRegistry } from "./media-registry";
import type { StateFilesAssetStore } from "./state-files";

export const DEFAULT_AUDIO_READ_LIMIT_BYTES = 25 * 1024 * 1024;
export const DEFAULT_INLINE_TRANSCRIPT_CHARS = 8_000;
export const DEFAULT_INLINE_SEGMENTS = 24;

export interface AudioLanePreflightSuccess<TRequest> {
  readonly model: string;
  readonly request: TRequest;
  readonly estimate: MediaCostEstimate;
  readonly lineage?: MediaInvocationLineage;
  readonly resolvedAssets?: readonly ResolvedMediaAsset[];
}

interface AudioPreflightInput {
  readonly model?: string;
  readonly text?: string;
  readonly voice?: string;
  readonly format?: string;
  readonly language?: string;
  readonly speed?: number;
  readonly style?: string;
  readonly input_asset?: string;
  readonly timestamps?: string;
}

export function createAudioPreflight<TInput, TRequest>(options: {
  readonly operation: "speech.generate" | "audio.transcribe";
  readonly defaultModel: string;
  readonly assetStore?: Pick<StateFilesAssetStore, "read">;
  readonly registry?: () => Promise<MediaResult<MediaRegistry, string>>;
  readonly mapRequest: (input: TInput) => TRequest;
}): AudioLanePreflight<TInput, TRequest> {
  const shared = createMediaPreflight({
    registry: options.registry ?? defaultMediaRegistry,
    selectModel: (_operation, input) => readAudioInput(input).model ?? options.defaultModel,
    selectSettings: (_operation, input) => audioSettings(options.operation, readAudioInput(input)),
    resolveAssets: async (input) => resolveAudioInputs(options, readAudioInput(input)),
  });
  return async (input) => {
    // Same policy as the image/video lanes: an explicit model request needs fresh
    // catalog membership; a default-model call may use the bounded stale window.
    const catalogPolicy = readAudioInput(input).model === undefined ? "allow_stale" : "fresh";
    const checked = await shared.run({ operation: options.operation, input, catalogPolicy });
    if (!checked.ok) return checked;
    const estimate = options.operation === "speech.generate"
      ? estimateSpeechCharacterCost(readAudioInput(input).text ?? "", checked.value.profile.pricing?.speechPerCharacterUsd)
      : checked.value.estimate;
    return { ok: true, value: {
      model: checked.value.lineage.concreteModelId,
      request: options.mapRequest(input),
      estimate,
      lineage: { ...checked.value.lineage, estimate },
      resolvedAssets: resolvedAssetsFromMappedCall(checked.value.mappedCall),
    } };
  };
}

function audioSettings(operation: "speech.generate" | "audio.transcribe", input: AudioPreflightInput): Readonly<Record<string, unknown>> {
  if (operation === "speech.generate") return {
    ...(input.voice === undefined ? {} : { voice: input.voice }),
    ...(input.format === undefined ? {} : { format: input.format }),
    ...(input.language === undefined ? {} : { language: input.language }),
    ...(input.speed === undefined ? {} : { speed: input.speed }),
    ...(input.style === undefined ? {} : { style: input.style }),
  };
  return {
    ...(input.timestamps === undefined ? {} : { timestamps: input.timestamps }),
  };
}

async function resolveAudioInputs(
  options: { readonly operation: "speech.generate" | "audio.transcribe"; readonly assetStore?: Pick<StateFilesAssetStore, "read"> },
  input: AudioPreflightInput,
): Promise<MediaResult<readonly ResolvedMediaAsset[], MediaCorrection>> {
  if (options.operation === "speech.generate") return { ok: true, value: [] };
  const ref = input.input_asset === undefined ? null : parseMediaAssetRef(input.input_asset);
  if (ref === null) return { ok: false, error: { code: "asset_invalid", message: "input_asset must be a valid files: state asset path." } };
  if (options.assetStore === undefined) return { ok: false, error: { code: "asset_invalid", message: "No audio asset store is configured." } };
  try {
    const asset = await resolveAudioAsset(options.assetStore, ref);
    return { ok: true, value: [asset] };
  } catch (error) {
    return { ok: false, error: { code: "asset_invalid", message: error instanceof Error ? error.message : "The audio asset could not be read." } };
  }
}

function resolvedAssetsFromMappedCall(value: unknown): readonly ResolvedMediaAsset[] {
  if (typeof value !== "object" || value === null || !("assets" in value) || !Array.isArray(value.assets)) return [];
  return value.assets.filter(isResolvedMediaAsset);
}

function isResolvedMediaAsset(value: unknown): value is ResolvedMediaAsset {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Reflect.get(value, "body") instanceof Uint8Array && typeof Reflect.get(value, "contentType") === "string" && typeof Reflect.get(value, "bytes") === "number";
}

function readAudioInput(value: unknown): AudioPreflightInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  return {
    ...(typeof input.model === "string" ? { model: input.model } : {}),
    ...(typeof input.text === "string" ? { text: input.text } : {}),
    ...(typeof input.voice === "string" ? { voice: input.voice } : {}),
    ...(typeof input.format === "string" ? { format: input.format } : {}),
    ...(typeof input.language === "string" ? { language: input.language } : {}),
    ...(typeof input.speed === "number" ? { speed: input.speed } : {}),
    ...(typeof input.style === "string" ? { style: input.style } : {}),
    ...(typeof input.input_asset === "string" ? { input_asset: input.input_asset } : {}),
    ...(typeof input.timestamps === "string" ? { timestamps: input.timestamps } : {}),
  };
}

export type AudioLanePreflight<TInput, TRequest> = (
  input: TInput,
) => Promise<MediaResult<AudioLanePreflightSuccess<TRequest>, MediaCorrection>>;

export function estimateSpeechCharacterCost(
  text: string,
  perCharacterUsd?: string,
): MediaCostEstimate {
  if (perCharacterUsd === undefined) return { confidence: "unknown" };
  const rate = Number(perCharacterUsd);
  if (!Number.isFinite(rate) || rate < 0) return { confidence: "unknown" };
  return { confidence: "exact", amountUsd: text.length * rate };
}

export function correctionError(correction: MediaCorrection): Error {
  return new Error(`${correction.message} [${correction.code}] No provider request was made.`);
}

export async function resolveAudioAsset(
  store: Pick<StateFilesAssetStore, "read">,
  ref: MediaAssetRef,
  maxBytes = DEFAULT_AUDIO_READ_LIMIT_BYTES,
) {
  const asset = await store.read(ref, { maxBytes });
  if (asset.kind !== "audio") {
    throw new Error("transcribe_audio accepts audio assets only; no provider request was made.");
  }
  return asset;
}

export function audioOutputPath(options: {
  readonly outputDir?: string;
  readonly stem: string;
  readonly id: string;
  readonly extension: string;
}): string {
  const dir = options.outputDir ?? "generated";
  const stem = options.stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 48) || "audio";
  return `${dir}/${stem}-${options.id}.${options.extension}`;
}

export interface TranscriptSegment {
  readonly text: string;
  readonly startSecond: number;
  readonly endSecond: number;
}

function captionTime(seconds: number, decimal: "," | "."): string {
  const millis = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(millis / 3_600_000);
  const minutes = Math.floor((millis % 3_600_000) / 60_000);
  const secs = Math.floor((millis % 60_000) / 1000);
  const remainder = millis % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}${decimal}${String(remainder).padStart(3, "0")}`;
}

export function serializeTranscript(
  format: "json" | "srt" | "vtt",
  text: string,
  segments: readonly TranscriptSegment[],
): { readonly body: Uint8Array; readonly contentType: string; readonly extension: string } {
  const value = format === "json"
    ? `${JSON.stringify({ text, segments }, null, 2)}\n`
    : format === "srt"
      ? segments.map((segment, index) => `${index + 1}\n${captionTime(segment.startSecond, ",")} --> ${captionTime(segment.endSecond, ",")}\n${segment.text}\n`).join("\n")
      : `WEBVTT\n\n${segments.map((segment) => `${captionTime(segment.startSecond, ".")} --> ${captionTime(segment.endSecond, ".")}\n${segment.text}\n`).join("\n")}`;
  return {
    body: new TextEncoder().encode(value),
    contentType: format === "json" ? "application/json" : format === "srt" ? "application/x-subrip" : "text/vtt",
    extension: format,
  };
}
