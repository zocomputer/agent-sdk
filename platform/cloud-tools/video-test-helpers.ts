import type { GatewayMediaModel, MediaModelProfile, MediaProviderAdapter, ResolvedMediaAsset } from "./media-contracts";
import { createMediaPreflight } from "./media-preflight";
import type { MediaRegistry } from "./media-registry";
import type { StateFilesAssetWriter } from "./state-files";
import { generateVideoTool } from "./video";

type Tool = ReturnType<typeof generateVideoTool>;
export const toolContext = new Proxy({}, {}) as Parameters<Tool["execute"]>[1];

export function videoResult() { return { video: { mediaType: "video/mp4", uint8Array: new Uint8Array([9, 8, 7, 6, 5]) }, warnings: ["soft warning"] }; }

export function recordingWriter(): StateFilesAssetWriter & { readonly writes: { path: string; body: Uint8Array; contentType?: string }[] } {
  const writes: { path: string; body: Uint8Array; contentType?: string }[] = [];
  return { writes, write(path, body, options) { writes.push({ path, body, ...(options?.contentType === undefined ? {} : { contentType: options.contentType }) }); return Promise.resolve({ type: "state_asset" as const, declarationName: "files", path, ...(options?.contentType === undefined ? {} : { contentType: options.contentType }), bytes: body.byteLength }); } };
}

export function mediaAsset(path: string, kind: "image" | "video" = "image"): ResolvedMediaAsset {
  return { ref: { type: "state_asset", declarationName: "files", path }, body: new Uint8Array(kind === "image" ? [1, 2] : [3, 4]), kind, contentType: kind === "image" ? "image/png" : "video/mp4", bytes: 2 };
}

export function preflight(operation: "video.generate" | "video.edit" = "video.generate", assets: readonly ResolvedMediaAsset[] = []) {
  const model: GatewayMediaModel = { id: operation === "video.edit" ? "xai/grok-imagine-video" : "bytedance/seedance-2.0-fast", name: "Video", description: "test", kind: "video", pricing: null, reportedOperations: [], rawCapabilities: null };
  const settings = [
    { kind: "enum" as const, name: "aspect_ratio", description: "", costEffect: "none" as const, mapping: "ai_sdk" as const, values: ["16:9", "9:16", "1:1"] },
    { kind: "enum" as const, name: "resolution", description: "", costEffect: "none" as const, mapping: "ai_sdk" as const, values: ["1280x720"] },
    { kind: "integer" as const, name: "duration_seconds", description: "", costEffect: "changes" as const, mapping: "ai_sdk" as const, min: 1, max: 30 },
    { kind: "integer" as const, name: "fps", description: "", costEffect: "none" as const, mapping: "ai_sdk" as const, min: 1, max: 60 },
    { kind: "boolean" as const, name: "generate_audio", description: "", costEffect: "may_change" as const, mapping: "ai_sdk" as const },
    { kind: "integer" as const, name: "seed", description: "", costEffect: "none" as const, mapping: "ai_sdk" as const, min: 0, max: Number.MAX_SAFE_INTEGER },
  ];
  const adapter: MediaProviderAdapter<"video.generate" | "video.edit"> = { modelId: model.id, operation, revision: "test.1", verifiedAt: "2026-07-12", overlay: () => ({ operation, inputs: { acceptedKinds: ["image", "video"], maxAssets: 3 }, outputs: { kind: "video" }, settings, provenance: {} }), mapRequest: (input, resolved) => ({ ok: true, value: { input, assets: resolved } }) };
  const profile: MediaModelProfile = { id: model.id, name: model.name, description: model.description, kind: "video", availability: "offered", pricing: null, adapterRevision: adapter.revision, verifiedAt: adapter.verifiedAt, lineage: { snapshotId: "snap", fetchedAt: "2026-07-12T00:00:00Z", validatedAt: "2026-07-12T00:00:00Z", stale: false, status: "fresh" }, operations: [adapter.overlay(model)] };
  const registry: MediaRegistry = { list: () => [profile], inspect: () => profile, executable: (id, requested) => id === model.id && requested === operation ? { profile, adapter } : null };
  return createMediaPreflight({
    registry: () => Promise.resolve({ ok: true, value: registry }),
    resolveAssets: () => Promise.resolve({ ok: true, value: assets }),
    selectModel: () => model.id,
    selectSettings: (_operation, input) => {
      if (typeof input !== "object" || input === null) return {};
      return Object.fromEntries(Object.entries(input).filter(([key]) => settings.some((setting) => setting.name === key)));
    },
  });
}
