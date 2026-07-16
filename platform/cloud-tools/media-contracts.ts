/** Media model families exposed by the batch cloud-tool suite. */
export type MediaModelKind = "image" | "video" | "speech" | "transcription";

/** Stable operations implemented by purpose-named media tools. */
export type MediaOperation =
  | "image.generate"
  | "image.edit"
  | "video.generate"
  | "video.edit"
  | "speech.generate"
  | "audio.transcribe";

/** Where one effective capability value came from. */
export type MediaCapabilitySource = "gateway" | "adapter" | "derived" | "unknown";

/** Whether a catalog model may execute through seeded Zo agents. */
export type MediaModelAvailability = "offered" | "unverified" | "unavailable";

/** Canonical durable media identity. Optional metadata is descriptive, never authority. */
export interface MediaAssetRef {
  readonly type: "state_asset";
  readonly declarationName: string;
  readonly path: string;
  readonly integrity?: string;
  readonly contentType?: string;
  readonly bytes?: number;
}

/** Trusted asset facts established by the bounded state-files resolver. */
export interface ResolvedMediaAsset {
  readonly ref: MediaAssetRef;
  readonly body: Uint8Array;
  readonly kind: "image" | "video" | "audio";
  readonly contentType: string;
  readonly bytes: number;
}

/**
 * Where a declared setting lands in the provider request — the setting's reason
 * to exist. `"ai_sdk"` means a first-class AI SDK parameter the lane executor
 * forwards; the object form means the adapter itself writes it into
 * `providerOptions[providerOptionsKey][field]` (optionally translating enum
 * values through `values`). There is deliberately no "mapped later" variant: a
 * setting that nothing forwards must not be declarable, or preflight validates
 * a knob execution ignores. `media-settings-conformance.test.ts` enforces the
 * runtime half of this contract for every adapter in the roster.
 */
export type MediaSettingMapping =
  | "ai_sdk"
  | {
      readonly providerOptionsKey: string;
      readonly field: string;
      readonly values?: Readonly<Record<string, string | number | boolean>>;
    };

/** Scalar setting vocabulary shared by discovery and dependent validation. */
export type MediaSettingDefinition =
  | {
      readonly kind: "enum";
      readonly name: string;
      readonly description: string;
      readonly costEffect: "none" | "may_change" | "changes" | "unknown";
      readonly mapping: MediaSettingMapping;
      readonly values: readonly string[];
      readonly default?: string;
    }
  | {
      readonly kind: "integer";
      readonly name: string;
      readonly description: string;
      readonly costEffect: "none" | "may_change" | "changes" | "unknown";
      readonly mapping: MediaSettingMapping;
      readonly min: number;
      readonly max: number;
      readonly default?: number;
    }
  | {
      readonly kind: "number";
      readonly name: string;
      readonly description: string;
      readonly costEffect: "none" | "may_change" | "changes" | "unknown";
      readonly mapping: MediaSettingMapping;
      readonly min: number;
      readonly max: number;
      readonly default?: number;
    }
  | {
      readonly kind: "boolean";
      readonly name: string;
      readonly description: string;
      readonly costEffect: "none" | "may_change" | "changes" | "unknown";
      readonly mapping: MediaSettingMapping;
      readonly default?: boolean;
    }
  | {
      readonly kind: "string";
      readonly name: string;
      readonly description: string;
      readonly costEffect: "none" | "may_change" | "changes" | "unknown";
      readonly mapping: MediaSettingMapping;
      readonly maxLength: number;
    };

/** Media input limits known for one operation. Unknown values stay absent. */
export interface MediaInputCapabilities {
  readonly acceptedKinds: readonly ("image" | "video" | "audio")[];
  readonly maxAssets?: number;
  readonly maxBytesPerAsset?: number;
  readonly supportedFormats?: readonly string[];
}

/** Media output facts known for one operation. */
export interface MediaOutputCapabilities {
  readonly kind: "image" | "video" | "audio" | "transcript";
  readonly supportedFormats?: readonly string[];
  readonly maxOutputs?: number;
}

/** One normalized operation supported by a concrete model. */
export interface MediaOperationProfile<TOperation extends MediaOperation = MediaOperation> {
  readonly operation: TOperation;
  readonly inputs: MediaInputCapabilities;
  readonly outputs: MediaOutputCapabilities;
  readonly settings: readonly MediaSettingDefinition[];
  readonly provenance: Readonly<Record<string, MediaCapabilitySource>>;
}

/** Pricing dimensions retained from the Gateway catalog. */
export interface MediaPricing {
  readonly inputPerTokenUsd?: string;
  readonly outputPerTokenUsd?: string;
  readonly imagePerOutputUsd?: string;
  readonly imageDimensions?: readonly Readonly<Record<string, string | number | boolean>>[];
  readonly speechPerCharacterUsd?: string;
  readonly transcriptionPerSecondUsd?: string;
  readonly videoDuration?: readonly Readonly<Record<string, string | number | boolean>>[];
}

/** Parsed current-catalog record before a Zo adapter is applied. */
export interface GatewayMediaModel {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: MediaModelKind;
  readonly pricing: MediaPricing | null;
  readonly reportedOperations: readonly string[];
  readonly rawCapabilities: Readonly<Record<string, unknown>> | null;
}

/** Deterministic identity and freshness for one parsed catalog snapshot. */
export interface MediaCatalogLineage {
  readonly snapshotId: string;
  readonly fetchedAt: string;
  readonly validatedAt: string;
  readonly stale: boolean;
  readonly status: "fresh" | "stale" | "unavailable";
}

interface MediaModelProfileBase {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly availability: MediaModelAvailability;
  readonly pricing: MediaPricing | null;
  readonly adapterRevision: string | null;
  readonly verifiedAt: string | null;
  readonly lineage: MediaCatalogLineage;
}

/** Discovery/execution profile after joining current catalog data with a Zo adapter. */
export type MediaModelProfile =
  | (MediaModelProfileBase & {
      readonly kind: "image";
      readonly operations: readonly MediaOperationProfile<"image.generate" | "image.edit">[];
    })
  | (MediaModelProfileBase & {
      readonly kind: "video";
      readonly operations: readonly MediaOperationProfile<"video.generate" | "video.edit">[];
    })
  | (MediaModelProfileBase & {
      readonly kind: "speech";
      readonly operations: readonly MediaOperationProfile<"speech.generate">[];
    })
  | (MediaModelProfileBase & {
      readonly kind: "transcription";
      readonly operations: readonly MediaOperationProfile<"audio.transcribe">[];
    });

/** Cost estimate produced before any provider or state-write side effect. */
export type MediaCostEstimate =
  | { readonly confidence: "exact"; readonly amountUsd: number }
  | { readonly confidence: "range"; readonly minUsd: number; readonly maxUsd: number }
  | { readonly confidence: "unknown" };

/** Durable invocation facts written beside the paid usage event. */
export interface MediaInvocationLineage {
  readonly operation: MediaOperation;
  readonly concreteModelId: string;
  readonly catalogSnapshotId: string | null;
  readonly catalogStatus: MediaCatalogLineage["status"];
  readonly adapterRevision: string;
  readonly estimate: MediaCostEstimate;
}

/** Model-facing media tools in the completed suite. */
export const MEDIA_TOOL_NAMES = [
  "media_models",
  "generate_image",
  "edit_image",
  "generate_video",
  "edit_video",
  "generate_speech",
  "transcribe_audio",
] as const;

export type MediaToolName = (typeof MEDIA_TOOL_NAMES)[number];

/** Result vocabulary used inside the vendored cloud-tools package. */
export type MediaResult<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Corrective feedback returned before a paid call when an invocation is invalid. */
export interface MediaCorrection {
  readonly code:
    | "catalog_unavailable"
    | "model_unavailable"
    | "model_unverified"
    | "operation_unsupported"
    | "asset_invalid"
    | "setting_unsupported"
    | "cost_rejected";
  readonly message: string;
}

/** Adapter contract: curated interpretation and request mapping, never a catalog cache. */
export interface MediaProviderAdapter<
  TOperation extends MediaOperation = MediaOperation,
  TMappedCall = unknown,
> {
  readonly modelId: string;
  readonly operation: TOperation;
  readonly revision: string;
  readonly verifiedAt: string;
  overlay(model: GatewayMediaModel): MediaOperationProfile<TOperation>;
  mapRequest(
    input: unknown,
    assets: readonly ResolvedMediaAsset[],
  ): MediaResult<TMappedCall, MediaCorrection>;
}

/** Successful preflight result consumed by a thin tool executor. */
export interface MediaPreflightSuccess<
  TOperation extends MediaOperation = MediaOperation,
  TMappedCall = unknown,
> {
  readonly profile: MediaModelProfile;
  readonly adapter: MediaProviderAdapter<TOperation, TMappedCall>;
  readonly mappedCall: TMappedCall;
  readonly estimate: MediaCostEstimate;
  readonly lineage: MediaInvocationLineage;
}

/** Shared preflight seam. Implementations must finish before provider/state side effects. */
export interface MediaPreflight {
  run<TOperation extends MediaOperation, TMappedCall = unknown>(request: {
    readonly operation: TOperation;
    readonly input: unknown;
    readonly catalogPolicy: "fresh" | "allow_stale" | "default_outage";
  }): Promise<MediaResult<MediaPreflightSuccess<TOperation, TMappedCall>, MediaCorrection>>;
}
