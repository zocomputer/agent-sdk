import type { MediaCorrection, MediaCostEstimate, MediaOperation, MediaPreflight, MediaPreflightSuccess, MediaProviderAdapter, MediaResult, ResolvedMediaAsset } from "./media-contracts";
import type { MediaRegistry } from "./media-registry";

export function createMediaPreflight(options: {
  readonly registry: () => Promise<MediaResult<MediaRegistry, string>>;
  readonly resolveAssets: (input: unknown) => Promise<MediaResult<readonly ResolvedMediaAsset[], MediaCorrection>>;
  readonly selectModel: (operation: MediaOperation, input: unknown) => string;
  readonly selectSettings?: (operation: MediaOperation, input: unknown) => Readonly<Record<string, unknown>>;
  readonly estimate?: (profile: MediaPreflightSuccess["profile"], operation: MediaOperation, input: unknown) => MediaCostEstimate;
  readonly approve?: (estimate: MediaCostEstimate) => boolean;
}): MediaPreflight {
  const run: MediaPreflight["run"] = async <TOperation extends MediaOperation, TMappedCall = unknown>(request: { readonly operation: TOperation; readonly input: unknown; readonly catalogPolicy: "fresh" | "allow_stale" | "default_outage" }): Promise<MediaResult<MediaPreflightSuccess<TOperation, TMappedCall>, MediaCorrection>> => {
    const registry = await options.registry();
    if (!registry.ok) return correction("catalog_unavailable", registry.error);
    const modelId = options.selectModel(request.operation, request.input);
    const executable = registry.value.executable(modelId, request.operation);
    if (!executable) {
      const known = registry.value.inspect(modelId);
      return correction(known?.availability === "unverified" ? "model_unverified" : known?.availability === "unavailable" ? "model_unavailable" : "operation_unsupported", `Model ${modelId} cannot run ${request.operation}. Inspect media_models for an offered alternative.`);
    }
    if (request.catalogPolicy === "fresh" && executable.profile.lineage.status !== "fresh") {
      return correction("catalog_unavailable", "The current media catalog is stale. Retry after discovery refreshes it.");
    }
    if (request.catalogPolicy === "default_outage" && executable.profile.lineage.status === "stale") {
      return correction("catalog_unavailable", "The default outage path requires an unavailable-catalog profile, not stale catalog data.");
    }
    const assets = await options.resolveAssets(request.input);
    if (!assets.ok) return assets;
    const operationProfile = executable.profile.operations.find((candidate) => candidate.operation === request.operation);
    if (!operationProfile) return correction("operation_unsupported", `Model ${modelId} no longer supports ${request.operation}.`);
    const invalidAsset = validateAssets(assets.value, operationProfile.inputs);
    if (invalidAsset !== null) return correction("asset_invalid", invalidAsset);
    const invalidSetting = validateSettings(options.selectSettings?.(request.operation, request.input) ?? {}, operationProfile.settings);
    if (invalidSetting !== null) return correction("setting_unsupported", invalidSetting);
    // The registry proved the exact operation match above. The frozen generic contract
    // cannot express that existential narrowing, so keep the assertion at this seam.
    const adapter = executable.adapter as MediaProviderAdapter<TOperation, TMappedCall>;
    const mapped = adapter.mapRequest(request.input, assets.value);
    if (!mapped.ok) return mapped;
    // Estimate from what the provider call will actually do: the adapter's
    // mapped settings supersede the raw input for the fields they carry
    // (executors bill from mapped.settings — e.g. image count/size — so an
    // estimate read only from raw input could disagree with the real spend).
    const estimationInput = estimationSource(request.input, mapped.value);
    const estimate = options.estimate?.(executable.profile, request.operation, estimationInput) ?? estimateMediaCost(executable.profile, request.operation, estimationInput);
    const approve = options.approve ?? defaultCostApproval;
    if (!approve(estimate)) return correction("cost_rejected", "Estimated media cost exceeds the configured policy; choose a lower-cost model or settings.");
    return { ok: true, value: { profile: executable.profile, adapter, mappedCall: mapped.value, estimate, lineage: { operation: request.operation, concreteModelId: modelId, catalogSnapshotId: executable.profile.lineage.snapshotId, catalogStatus: executable.profile.lineage.status, adapterRevision: adapter.revision, estimate } } };
  };
  return { run };
}

/** Raw input overlaid with the adapter's mapped settings, when it exposes them. */
function estimationSource(input: unknown, mappedCall: unknown): unknown {
  if (!isRecord(mappedCall) || !isRecord(mappedCall.settings)) return input;
  return { ...(isRecord(input) ? input : {}), ...mappedCall.settings };
}

function estimateMediaCost(profile: MediaPreflightSuccess["profile"], operation: MediaOperation, input: unknown): MediaCostEstimate {
  const pricing = profile.pricing;
  if (pricing === null || !isRecord(input)) return { confidence: "unknown" };
  const record = input;
  if (operation === "image.generate" || operation === "image.edit") {
    const rate = Number(pricing.imagePerOutputUsd);
    const count = typeof record.count === "number" ? record.count : 1;
    return Number.isFinite(rate) ? { confidence: "exact", amountUsd: rate * count } : { confidence: "unknown" };
  }
  if (operation === "speech.generate") {
    const rate = Number(pricing.speechPerCharacterUsd);
    return Number.isFinite(rate) && typeof record.text === "string" ? { confidence: "exact", amountUsd: rate * record.text.length } : { confidence: "unknown" };
  }
  if (operation === "video.generate" || operation === "video.edit") {
    const duration = typeof record.duration_seconds === "number" ? record.duration_seconds : null;
    const rates = pricing.videoDuration?.map((row) => Number(row.cost_per_second)).filter(Number.isFinite) ?? [];
    if (duration !== null && rates.length > 0) return { confidence: "range", minUsd: Math.min(...rates) * duration, maxUsd: Math.max(...rates) * duration };
  }
  return { confidence: "unknown" };
}

function defaultCostApproval(estimate: MediaCostEstimate): boolean {
  const configured = Number(process.env.ZO_MEDIA_MAX_COST_USD);
  if (!Number.isFinite(configured) || configured < 0) return true;
  if (estimate.confidence === "unknown") return false;
  return (estimate.confidence === "exact" ? estimate.amountUsd : estimate.maxUsd) <= configured;
}

function validateAssets(assets: readonly ResolvedMediaAsset[], capabilities: { readonly acceptedKinds: readonly ResolvedMediaAsset["kind"][]; readonly maxAssets?: number; readonly maxBytesPerAsset?: number; readonly supportedFormats?: readonly string[] }): string | null {
  if (capabilities.maxAssets !== undefined && assets.length > capabilities.maxAssets) return `This model accepts at most ${capabilities.maxAssets} media asset(s).`;
  for (const asset of assets) {
    if (!capabilities.acceptedKinds.includes(asset.kind)) return `This operation does not accept ${asset.kind} assets.`;
    if (capabilities.maxBytesPerAsset !== undefined && asset.bytes > capabilities.maxBytesPerAsset) return `Asset ${asset.ref.path} exceeds the ${capabilities.maxBytesPerAsset}-byte model limit.`;
    if (capabilities.supportedFormats !== undefined && !capabilities.supportedFormats.includes(asset.contentType)) return `Asset ${asset.ref.path} has unsupported format ${asset.contentType}.`;
  }
  return null;
}

function validateSettings(settings: Readonly<Record<string, unknown>>, definitions: readonly import("./media-contracts").MediaSettingDefinition[]): string | null {
  const supported = new Map(definitions.map((definition) => [definition.name, definition]));
  for (const [name, value] of Object.entries(settings)) {
    if (value === undefined) continue;
    const definition = supported.get(name);
    if (definition === undefined) return `Setting ${name} is not supported by this model and operation.`;
    if (definition.kind === "enum" && (typeof value !== "string" || !definition.values.includes(value))) return `Setting ${name} must be one of: ${definition.values.join(", ")}.`;
    if ((definition.kind === "integer" || definition.kind === "number") && (typeof value !== "number" || !Number.isFinite(value) || value < definition.min || value > definition.max || (definition.kind === "integer" && !Number.isInteger(value)))) return `Setting ${name} is outside its supported range.`;
    if (definition.kind === "boolean" && typeof value !== "boolean") return `Setting ${name} must be boolean.`;
    if (definition.kind === "string" && (typeof value !== "string" || value.length > definition.maxLength)) return `Setting ${name} is invalid or too long.`;
  }
  return null;
}

function correction(code: MediaCorrection["code"], message: string): MediaResult<never, MediaCorrection> { return { ok: false, error: { code, message } }; }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
