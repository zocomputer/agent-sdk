import type { MediaPreflight, MediaResult, ResolvedMediaAsset } from "./media-contracts";
import { parseMediaAssetRef } from "./media-asset";
import { defaultMediaRegistry } from "./media-models-default";
import { createMediaPreflight } from "./media-preflight";
import type { MediaRegistry } from "./media-registry";
import type { StateFilesAssetStore } from "./state-files";

export const VIDEO_ASSET_MAX_BYTES = 256 * 1024 * 1024;

interface VideoAssetInput {
  readonly model?: string;
  readonly input_asset?: string;
  readonly start_frame_asset?: string;
  readonly end_frame_asset?: string;
  readonly reference_asset?: string;
  readonly aspect_ratio?: string;
  readonly resolution?: string;
  readonly duration_seconds?: number;
  readonly fps?: number;
  readonly generate_audio?: boolean;
  readonly seed?: number;
}

export function createVideoPreflight(options: {
  readonly assetStore: StateFilesAssetStore;
  readonly defaultModel: string;
  readonly registry?: () => Promise<MediaResult<MediaRegistry, string>>;
}): MediaPreflight {
  return createMediaPreflight({
    registry: options.registry ?? defaultMediaRegistry,
    selectModel: (_operation, input) => readVideoInput(input).model ?? options.defaultModel,
    selectSettings: (_operation, input) => {
      const value = readVideoInput(input);
      return {
        ...(value.aspect_ratio === undefined ? {} : { aspect_ratio: value.aspect_ratio }),
        ...(value.resolution === undefined ? {} : { resolution: value.resolution }),
        ...(value.duration_seconds === undefined ? {} : { duration_seconds: value.duration_seconds }),
        ...(value.fps === undefined ? {} : { fps: value.fps }),
        ...(value.generate_audio === undefined ? {} : { generate_audio: value.generate_audio }),
        ...(value.seed === undefined ? {} : { seed: value.seed }),
      };
    },
    resolveAssets: async (input) => resolveVideoAssets(options.assetStore, readVideoInput(input)),
  });
}

async function resolveVideoAssets(store: StateFilesAssetStore, input: VideoAssetInput): Promise<MediaResult<readonly ResolvedMediaAsset[], { readonly code: "asset_invalid"; readonly message: string }>> {
  const values = [input.input_asset, input.start_frame_asset, input.end_frame_asset, input.reference_asset].filter((value): value is string => value !== undefined);
  const refs = [];
  for (const value of values) {
    const ref = parseMediaAssetRef(value);
    if (ref === null) return { ok: false, error: { code: "asset_invalid", message: "Media assets must use a files:path/to/file scalar." } };
    refs.push(ref);
  }
  try {
    return { ok: true, value: await Promise.all(refs.map((ref) => store.read(ref, { maxBytes: VIDEO_ASSET_MAX_BYTES }))) };
  } catch (error) {
    return { ok: false, error: { code: "asset_invalid", message: error instanceof Error ? error.message : "The video asset could not be read." } };
  }
}

function readVideoInput(input: unknown): VideoAssetInput {
  if (!isRecord(input)) return {};
  return {
    ...(typeof input.model === "string" ? { model: input.model } : {}),
    ...(typeof input.input_asset === "string" ? { input_asset: input.input_asset } : {}),
    ...(typeof input.start_frame_asset === "string" ? { start_frame_asset: input.start_frame_asset } : {}),
    ...(typeof input.end_frame_asset === "string" ? { end_frame_asset: input.end_frame_asset } : {}),
    ...(typeof input.reference_asset === "string" ? { reference_asset: input.reference_asset } : {}),
    ...(typeof input.aspect_ratio === "string" ? { aspect_ratio: input.aspect_ratio } : {}),
    ...(typeof input.resolution === "string" ? { resolution: input.resolution } : {}),
    ...(typeof input.duration_seconds === "number" ? { duration_seconds: input.duration_seconds } : {}),
    ...(typeof input.fps === "number" ? { fps: input.fps } : {}),
    ...(typeof input.generate_audio === "boolean" ? { generate_audio: input.generate_audio } : {}),
    ...(typeof input.seed === "number" ? { seed: input.seed } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
