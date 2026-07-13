import type { MediaPreflight, MediaResult, ResolvedMediaAsset } from "./media-contracts";
import type { NormalizedMediaProviderRequest } from "./media-adapters";
import { parseMediaAssetRef } from "./media-asset";
import { createMediaPreflight } from "./media-preflight";
import { defaultMediaRegistry } from "./media-models-default";
import type { MediaRegistry } from "./media-registry";
import type { StateFilesAssetStore } from "./state-files";

export const IMAGE_ASSET_MAX_BYTES = 20 * 1024 * 1024;

interface ImageAssetInput {
  readonly model?: string;
  readonly input_asset?: string;
  readonly mask_asset?: string;
  readonly reference_asset?: string;
  readonly aspect_ratio?: string;
  readonly size?: string;
  readonly count?: number;
  readonly seed?: number;
  readonly safety?: string;
}

export function createImagePreflight(options: {
  readonly operation: "image.generate" | "image.edit";
  readonly assetStore: StateFilesAssetStore;
  readonly defaultModel: string;
  readonly registry?: () => Promise<MediaResult<MediaRegistry, string>>;
}): MediaPreflight {
  return createMediaPreflight({
    registry: options.registry ?? defaultMediaRegistry,
    selectModel: (_operation, input) => readImageInput(input).model ?? options.defaultModel,
    selectSettings: (_operation, input) => {
      const parsed = readImageInput(input);
      return {
        ...(parsed.aspect_ratio === undefined ? {} : { aspect_ratio: parsed.aspect_ratio }),
        ...(parsed.size === undefined ? {} : { size: parsed.size }),
        ...(parsed.count === undefined ? {} : { count: parsed.count }),
        ...(parsed.seed === undefined ? {} : { seed: parsed.seed }),
        ...(parsed.safety === undefined ? {} : { safety: parsed.safety }),
      };
    },
    resolveAssets: async (input) => resolveImageAssets(options.assetStore, readImageInput(input)),
  });
}

export function resolvedAssetsFromMappedCall(value: unknown): readonly ResolvedMediaAsset[] {
  if (!isRecord(value) || !Array.isArray(value.assets)) {
    throw new Error("The image adapter returned malformed media inputs; no provider call was made.");
  }
  const assets = value.assets.filter(isResolvedMediaAsset);
  if (assets.length !== value.assets.length) {
    throw new Error("The image adapter returned malformed media inputs; no provider call was made.");
  }
  return assets;
}

export function normalizedMappedCall(value: unknown, fallbackInput?: unknown): NormalizedMediaProviderRequest {
  if (isRecord(value) && Array.isArray(value.assets) && !Array.isArray(value.mediaInputs) && isRecord(fallbackInput)) {
    const assets = value.assets.filter(isResolvedMediaAsset);
    if (assets.length !== value.assets.length) throw new Error("The media adapter returned malformed media inputs; no provider call was made.");
    const roles = assetRoles(fallbackInput);
    return {
      input: fallbackInput,
      settings: scalarSettings(fallbackInput),
      providerOptions: {},
      assets,
      mediaInputs: assets.map((asset, index) => ({ role: roles[index] ?? "reference", asset })),
    };
  }
  if (!isRecord(value) || !isRecord(value.input) || !isRecord(value.settings) || !Array.isArray(value.assets) || !Array.isArray(value.mediaInputs)) {
    throw new Error("The media adapter returned a malformed provider request; no provider call was made.");
  }
  const assets = value.assets.filter(isResolvedMediaAsset);
  const mediaInputs = value.mediaInputs.filter(isMappedMediaInput);
  if (assets.length !== value.assets.length || mediaInputs.length !== value.mediaInputs.length) {
    throw new Error("The media adapter returned malformed media inputs; no provider call was made.");
  }
  const settings: Record<string, string | number | boolean> = {};
  for (const [name, setting] of Object.entries(value.settings)) {
    if (typeof setting !== "string" && typeof setting !== "number" && typeof setting !== "boolean") {
      throw new Error("The media adapter returned malformed settings; no provider call was made.");
    }
    settings[name] = setting;
  }
  return { input: value.input, settings, providerOptions: normalizedProviderOptions(value.providerOptions), assets, mediaInputs };
}

function normalizedProviderOptions(value: unknown): NormalizedMediaProviderRequest["providerOptions"] {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error("The media adapter returned malformed provider options; no provider call was made.");
  const options: Record<string, Record<string, string | number | boolean>> = {};
  for (const [providerKey, fields] of Object.entries(value)) {
    if (!isRecord(fields)) throw new Error("The media adapter returned malformed provider options; no provider call was made.");
    const normalized: Record<string, string | number | boolean> = {};
    for (const [field, fieldValue] of Object.entries(fields)) {
      if (typeof fieldValue !== "string" && typeof fieldValue !== "number" && typeof fieldValue !== "boolean") {
        throw new Error("The media adapter returned malformed provider options; no provider call was made.");
      }
      normalized[field] = fieldValue;
    }
    options[providerKey] = normalized;
  }
  return options;
}

function assetRoles(input: Record<string, unknown>): NormalizedMediaProviderRequest["mediaInputs"][number]["role"][] {
  const fields = [
    ["input_asset", "source"], ["mask_asset", "mask"], ["start_frame_asset", "start_frame"],
    ["end_frame_asset", "end_frame"], ["reference_asset", "reference"],
  ] as const;
  return fields.filter(([field]) => typeof input[field] === "string").map(([, role]) => role);
}

function scalarSettings(input: Record<string, unknown>): Record<string, string | number | boolean> {
  const ignored = new Set(["prompt", "model", "output_dir", "input_asset", "mask_asset", "start_frame_asset", "end_frame_asset", "reference_asset"]);
  const settings: Record<string, string | number | boolean> = {};
  for (const [name, value] of Object.entries(input)) {
    if (!ignored.has(name) && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) settings[name] = value;
  }
  return settings;
}

export function mappedMediaInput(call: NormalizedMediaProviderRequest, role: NormalizedMediaProviderRequest["mediaInputs"][number]["role"]): ResolvedMediaAsset | undefined {
  return call.mediaInputs.find((candidate) => candidate.role === role)?.asset;
}

export function correctionError(result: MediaResult<unknown, { readonly message: string }>): Error {
  return new Error(result.ok ? "Unexpected successful image preflight result." : `${result.error.message} No provider call was made.`);
}

async function resolveImageAssets(
  store: StateFilesAssetStore,
  input: ImageAssetInput,
): Promise<MediaResult<readonly ResolvedMediaAsset[], { readonly code: "asset_invalid"; readonly message: string }>> {
  const refs = [input.input_asset, input.mask_asset, input.reference_asset].filter(
    (value): value is string => value !== undefined,
  );
  const parsed = [];
  for (const value of refs) {
    const ref = parseMediaAssetRef(value);
    if (ref === null) {
      return { ok: false, error: { code: "asset_invalid", message: "Media assets must use a files:path/to/file scalar." } };
    }
    parsed.push(ref);
  }
  try {
    return {
      ok: true,
      value: await Promise.all(
        parsed.map((ref) => store.read(ref, { maxBytes: IMAGE_ASSET_MAX_BYTES })),
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "asset_invalid",
        message: error instanceof Error ? error.message : "The image asset could not be read.",
      },
    };
  }
}

function readImageInput(input: unknown): ImageAssetInput {
  if (!isRecord(input)) return {};
  return {
    ...(typeof input.model === "string" ? { model: input.model } : {}),
    ...(typeof input.input_asset === "string" ? { input_asset: input.input_asset } : {}),
    ...(typeof input.mask_asset === "string" ? { mask_asset: input.mask_asset } : {}),
    ...(typeof input.reference_asset === "string" ? { reference_asset: input.reference_asset } : {}),
    ...(typeof input.aspect_ratio === "string" ? { aspect_ratio: input.aspect_ratio } : {}),
    ...(typeof input.size === "string" ? { size: input.size } : {}),
    ...(typeof input.count === "number" ? { count: input.count } : {}),
    ...(typeof input.seed === "number" ? { seed: input.seed } : {}),
    ...(typeof input.safety === "string" ? { safety: input.safety } : {}),
  };
}

function isResolvedMediaAsset(value: unknown): value is ResolvedMediaAsset {
  return isRecord(value) && value.body instanceof Uint8Array &&
    (value.kind === "image" || value.kind === "video" || value.kind === "audio") &&
    typeof value.contentType === "string" && typeof value.bytes === "number" && isRecord(value.ref);
}

function isMappedMediaInput(value: unknown): value is NormalizedMediaProviderRequest["mediaInputs"][number] {
  return isRecord(value) && ["source", "mask", "reference", "start_frame", "end_frame"].includes(String(value.role)) && isResolvedMediaAsset(value.asset);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
