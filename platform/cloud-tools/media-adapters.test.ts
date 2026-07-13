import { describe, expect, test } from "bun:test";
import type { BlackForestLabsImageProviderOptions } from "@ai-sdk/black-forest-labs";
import { MEDIA_PROVIDER_ADAPTERS } from "./media-adapters";
import type { GatewayMediaModel, ResolvedMediaAsset } from "./media-contracts";

// The AI SDK's provider package is the maintained provider contract: `satisfies`
// pins our emitted providerOptions field to it, so a BFL rename (say,
// safetyTolerance) surfaces as a compile error on a Renovate bump instead of a
// silently ignored field. The mapRequest test below ties this same value to
// what the adapter actually emits.
const STRICT_SAFETY = { safetyTolerance: 0 } satisfies BlackForestLabsImageProviderOptions;

const baseModel: GatewayMediaModel = {
  id: "bfl/flux-kontext-pro",
  name: "Flux Kontext",
  description: "Image editing",
  kind: "image",
  pricing: null,
  reportedOperations: [],
  rawCapabilities: null,
};

function asset(path: string, kind: ResolvedMediaAsset["kind"] = "image"): ResolvedMediaAsset {
  return {
    ref: { type: "state_asset", declarationName: "files", path },
    body: new Uint8Array([1]),
    kind,
    contentType: kind === "image" ? "image/png" : kind === "video" ? "video/mp4" : "audio/mpeg",
    bytes: 1,
  };
}

describe("media provider adapters", () => {
  test("fills image defaults with adapter provenance when Gateway omits capabilities", () => {
    const adapter = findAdapter("bfl/flux-kontext-pro", "image.edit");
    const profile = adapter.overlay(baseModel);
    expect(profile.settings.map(({ name }) => name)).toContain("aspect_ratio");
    expect(profile.settings.map(({ name }) => name)).toContain("safety");
    expect(profile.provenance.settings).toBe("adapter");
  });

  test("preserves Gateway values and adds only missing curated settings", () => {
    const adapter = findAdapter("bfl/flux-kontext-pro", "image.edit");
    const profile = adapter.overlay({ ...baseModel, rawCapabilities: { supported_aspect_ratios: ["2:1"] } });
    const aspectRatio = profile.settings.find(({ name }) => name === "aspect_ratio");
    expect(aspectRatio?.kind === "enum" && aspectRatio.values).toEqual(["2:1"]);
    expect(profile.settings.filter(({ name }) => name === "aspect_ratio")).toHaveLength(1);
  });

  test("normalizes scalar settings and maps every accepted image role exactly once", () => {
    const adapter = findAdapter("bfl/flux-kontext-pro", "image.edit");
    const result = adapter.mapRequest(
      { prompt: "replace sky", input_asset: "files:source.png", mask_asset: "files:mask.png", reference_asset: "files:look.png", aspect_ratio: "1:1", safety: "strict" },
      [asset("look.png"), asset("source.png"), asset("mask.png")],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      input: { prompt: "replace sky" },
      settings: { aspect_ratio: "1:1", safety: "strict" },
      providerOptions: { blackForestLabs: STRICT_SAFETY },
      assets: [asset("source.png"), asset("mask.png"), asset("look.png")],
      mediaInputs: [
        { role: "source", asset: asset("source.png") },
        { role: "mask", asset: asset("mask.png") },
        { role: "reference", asset: asset("look.png") },
      ],
    });
  });

  test("rejects unsupported settings and missing role assets before producing a mapping", () => {
    const adapter = findAdapter("xai/grok-imagine-video", "video.generate");
    const invalidSetting = adapter.mapRequest({ duration_seconds: 2.5 }, []);
    expect(invalidSetting.ok).toBe(false);
    if (!invalidSetting.ok) expect(invalidSetting.error.code).toBe("setting_unsupported");

    const missingAsset = adapter.mapRequest({ input_asset: "files:start.png" }, []);
    expect(missingAsset.ok).toBe(false);
    if (!missingAsset.ok) expect(missingAsset.error.code).toBe("asset_invalid");
  });

  test("keeps duration and fps numeric in the normalized execution request", () => {
    const adapter = findAdapter("xai/grok-imagine-video", "video.generate");
    const result = adapter.mapRequest({ duration_seconds: 8, fps: 24 }, []);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.settings).toEqual({ duration_seconds: 8, fps: 24 });
  });

  test("rejects duplicate resolved assets rather than assigning one role twice", () => {
    const adapter = findAdapter("bfl/flux-kontext-pro", "image.edit");
    const result = adapter.mapRequest(
      { input_asset: "files:same.png", mask_asset: "files:same.png" },
      [asset("same.png"), asset("other.png")],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("asset_invalid");
  });
});

function findAdapter(modelId: string, operation: string) {
  const adapter = MEDIA_PROVIDER_ADAPTERS.find((candidate) => candidate.modelId === modelId && candidate.operation === operation);
  if (adapter === undefined) throw new Error(`Missing ${modelId} ${operation} adapter.`);
  return adapter;
}
