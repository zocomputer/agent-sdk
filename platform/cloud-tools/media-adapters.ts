import type {
  GatewayMediaModel,
  MediaCorrection,
  MediaOperation,
  MediaOperationProfile,
  MediaProviderAdapter,
  MediaResult,
  MediaSettingDefinition,
  ResolvedMediaAsset,
} from "./media-contracts";

export type AssetRole = "source" | "mask" | "reference" | "start_frame" | "end_frame";

export interface NormalizedMediaProviderRequest {
  readonly input: Readonly<Record<string, unknown>>;
  readonly settings: Readonly<Record<string, string | number | boolean>>;
  /**
   * Provider-keyed options derived from each setting's declared mapping —
   * executors forward this verbatim to the AI SDK call's `providerOptions`.
   */
  readonly providerOptions: Readonly<Record<string, Readonly<Record<string, string | number | boolean>>>>;
  /** Compatibility view consumed by today's executors. */
  readonly assets: readonly ResolvedMediaAsset[];
  /** Role-aware view for provider-specific request construction. */
  readonly mediaInputs: readonly { readonly role: AssetRole; readonly asset: ResolvedMediaAsset }[];
}

interface AdapterOptions {
  readonly acceptedKinds?: readonly ("image" | "video" | "audio")[];
  readonly settings?: readonly MediaSettingDefinition[];
  readonly assetRoles?: Readonly<Record<string, AssetRole>>;
}

function adapter(
  modelId: string,
  operation: MediaOperation,
  output: "image" | "video" | "audio" | "transcript",
  options: AdapterOptions = {},
): MediaProviderAdapter<MediaOperation, NormalizedMediaProviderRequest> {
  const acceptedKinds = options.acceptedKinds ?? [];
  const curatedSettings = options.settings ?? [];
  const assetRoles = options.assetRoles ?? {};
  return {
    modelId,
    operation,
    revision: "2026-07-12.2",
    verifiedAt: "2026-07-12",
    overlay(model: GatewayMediaModel): MediaOperationProfile {
      const caps = model.rawCapabilities;
      const strings = (key: string) => caps && Array.isArray(caps[key]) ? caps[key].filter((value): value is string => typeof value === "string") : undefined;
      const numbers = (key: string) => caps && Array.isArray(caps[key]) ? caps[key].filter((value): value is number => typeof value === "number" && Number.isFinite(value)) : undefined;
      const resolutions = strings("supported_resolutions");
      const aspectRatios = strings("supported_aspect_ratios");
      const durations = numbers("supported_durations_seconds");
      const fps = numbers("supported_fps");
      const inputLimits = caps?.input_limits;
      const inputRecord = isRecord(inputLimits) ? inputLimits : undefined;
      const relevantLimit = acceptedKinds.map((kind) => inputRecord?.[kind]).find(isRecord);
      const maxAssets = typeof relevantLimit?.max_count === "number" ? relevantLimit.max_count : undefined;
      const formats = Array.isArray(relevantLimit?.supported_formats) ? relevantLimit.supported_formats.filter((value): value is string => typeof value === "string") : undefined;
      const reportedSettings: MediaSettingDefinition[] = [
        ...(resolutions?.length ? [{ kind: "enum" as const, name: "resolution", description: "Output resolution", costEffect: "changes" as const, mapping: "ai_sdk" as const, values: resolutions }] : []),
        ...(aspectRatios?.length ? [{ kind: "enum" as const, name: "aspect_ratio", description: "Output aspect ratio", costEffect: "may_change" as const, mapping: "ai_sdk" as const, values: aspectRatios }] : []),
        ...(durations?.length ? [{ kind: "integer" as const, name: "duration_seconds", description: "Output duration in seconds", costEffect: "changes" as const, mapping: "ai_sdk" as const, min: Math.min(...durations), max: Math.max(...durations) }] : []),
        ...(fps?.length ? [{ kind: "integer" as const, name: "fps", description: "Frames per second", costEffect: "may_change" as const, mapping: "ai_sdk" as const, min: Math.min(...fps), max: Math.max(...fps) }] : []),
        ...(typeof caps?.generate_audio === "boolean" ? [{ kind: "boolean" as const, name: "generate_audio", description: "Generate synchronized audio", costEffect: "may_change" as const, mapping: "ai_sdk" as const, default: caps.generate_audio }] : []),
      ];
      const reportedNames = new Set(reportedSettings.map(({ name }) => name));
      const settings = [...reportedSettings, ...curatedSettings.filter(({ name }) => !reportedNames.has(name))];
      return {
        operation,
        inputs: { acceptedKinds, ...(maxAssets === undefined ? {} : { maxAssets }), ...(formats?.length ? { supportedFormats: formats } : {}) },
        outputs: { kind: output },
        settings,
        provenance: {
          operation: "adapter",
          inputs: inputRecord ? "gateway" : acceptedKinds.length ? "adapter" : "unknown",
          settings: curatedSettings.length ? "adapter" : reportedSettings.length ? "gateway" : "unknown",
          pricing: "gateway",
        },
      };
    },
    mapRequest(input: unknown, assets: readonly ResolvedMediaAsset[]) {
      if (!isRecord(input)) return correction("setting_unsupported", "Media input must be an object.");
      const settings = normalizeSettings(input, curatedSettings);
      if (!settings.ok) return settings;
      const mappedAssets = mapAssets(input, assets, assetRoles);
      if (!mappedAssets.ok) return mappedAssets;
      return {
        ok: true,
        value: {
          input: Object.fromEntries(Object.entries(input).filter(([name]) => !isControlField(name) && !isSettingField(name) && !(name in assetRoles))),
          settings: settings.value,
          providerOptions: providerOptionsFromSettings(settings.value, curatedSettings),
          assets: mappedAssets.value.map(({ asset }) => asset),
          mediaInputs: mappedAssets.value,
        },
      };
    },
  };
}

// Every entry's `mapping` says exactly where the value lands in the provider
// request; the settings-conformance test proves each one changes the outgoing
// call. `quality`/`style` return here when a roster model maps them.
const IMAGE_SETTINGS: readonly MediaSettingDefinition[] = [
  { kind: "enum", name: "aspect_ratio", description: "Output aspect ratio", costEffect: "may_change", mapping: "ai_sdk", values: ["1:1", "16:9", "9:16", "4:3", "3:4"] },
  { kind: "string", name: "size", description: "Output dimensions as width x height", costEffect: "changes", mapping: "ai_sdk", maxLength: 24 },
  { kind: "integer", name: "count", description: "Number of output images", costEffect: "changes", mapping: "ai_sdk", min: 1, max: 4 },
  { kind: "integer", name: "seed", description: "Deterministic generation seed", costEffect: "none", mapping: "ai_sdk", min: 0, max: 2_147_483_647 },
  {
    kind: "enum",
    name: "safety",
    description: "Content moderation strictness",
    costEffect: "none",
    // BFL's safetyTolerance spans 0 (strictest) to 6 (most permissive); "relaxed"
    // deliberately maps to 4, not the maximum, for a hosted product.
    mapping: { providerOptionsKey: "blackForestLabs", field: "safetyTolerance", values: { strict: 0, standard: 2, relaxed: 4 } },
    values: ["strict", "standard", "relaxed"],
  },
];

// Editing keeps the source's framing: no count/size/seed until the edit
// executor forwards them.
const IMAGE_EDIT_SETTINGS: readonly MediaSettingDefinition[] = IMAGE_SETTINGS.filter(({ name }) => name === "aspect_ratio" || name === "safety");

const VIDEO_SETTINGS: readonly MediaSettingDefinition[] = [
  { kind: "enum", name: "aspect_ratio", description: "Output aspect ratio", costEffect: "may_change", mapping: "ai_sdk", values: ["16:9", "9:16", "1:1"] },
  { kind: "enum", name: "resolution", description: "Output resolution", costEffect: "changes", mapping: "ai_sdk", values: ["480x854", "854x480", "720x1280", "1280x720", "1080x1920", "1920x1080"] },
  { kind: "integer", name: "duration_seconds", description: "Output duration in seconds", costEffect: "changes", mapping: "ai_sdk", min: 1, max: 30 },
  { kind: "integer", name: "fps", description: "Frames per second", costEffect: "may_change", mapping: "ai_sdk", min: 1, max: 60 },
  { kind: "boolean", name: "generate_audio", description: "Generate synchronized audio", costEffect: "may_change", mapping: "ai_sdk" },
  { kind: "integer", name: "seed", description: "Deterministic generation seed", costEffect: "none", mapping: "ai_sdk", min: 0, max: 2_147_483_647 },
];

const SPEECH_SETTINGS: readonly MediaSettingDefinition[] = [
  { kind: "enum", name: "voice", description: "Voice", costEffect: "none", mapping: "ai_sdk", values: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] },
  { kind: "enum", name: "format", description: "Audio format", costEffect: "none", mapping: "ai_sdk", values: ["mp3", "wav"] },
  { kind: "number", name: "speed", description: "Speaking speed", costEffect: "none", mapping: "ai_sdk", min: 0.25, max: 4 },
  { kind: "string", name: "style", description: "Delivery instructions", costEffect: "none", mapping: "ai_sdk", maxLength: 500 },
  { kind: "string", name: "language", description: "ISO language code", costEffect: "none", mapping: "ai_sdk", maxLength: 16 },
];

const TRANSCRIPTION_SETTINGS: readonly MediaSettingDefinition[] = [
  { kind: "enum", name: "timestamps", description: "Timestamp detail", costEffect: "none", mapping: "ai_sdk", values: ["none", "segment"] },
];

export const MEDIA_PROVIDER_ADAPTERS = [
  adapter("bfl/flux-2-pro", "image.generate", "image", { settings: IMAGE_SETTINGS }),
  adapter("bfl/flux-kontext-pro", "image.generate", "image", { acceptedKinds: ["image"], settings: IMAGE_SETTINGS, assetRoles: { input_asset: "reference", reference_asset: "reference" } }),
  adapter("bfl/flux-kontext-pro", "image.edit", "image", { acceptedKinds: ["image"], settings: IMAGE_EDIT_SETTINGS, assetRoles: { input_asset: "source", mask_asset: "mask", reference_asset: "reference" } }),
  adapter("bytedance/seedance-2.0-fast", "video.generate", "video", { acceptedKinds: ["image"], settings: VIDEO_SETTINGS, assetRoles: { input_asset: "source", start_frame_asset: "start_frame", end_frame_asset: "end_frame", reference_asset: "reference" } }),
  adapter("xai/grok-imagine-video", "video.generate", "video", { acceptedKinds: ["image"], settings: VIDEO_SETTINGS, assetRoles: { input_asset: "source", start_frame_asset: "start_frame", end_frame_asset: "end_frame", reference_asset: "reference" } }),
  // Editing declares no settings: the xai edit endpoint matches the source's
  // aspect/resolution and rejects custom duration/framing (see the plan doc).
  adapter("xai/grok-imagine-video", "video.edit", "video", { acceptedKinds: ["video"], assetRoles: { input_asset: "source" } }),
  adapter("openai/tts-1", "speech.generate", "audio", { settings: SPEECH_SETTINGS }),
  adapter("openai/whisper-1", "audio.transcribe", "transcript", { acceptedKinds: ["audio"], settings: TRANSCRIPTION_SETTINGS, assetRoles: { input_asset: "source" } }),
] satisfies readonly MediaProviderAdapter[];

function normalizeSettings(input: Readonly<Record<string, unknown>>, definitions: readonly MediaSettingDefinition[]): MediaResult<Readonly<Record<string, string | number | boolean>>, MediaCorrection> {
  const supported = new Map(definitions.map((definition) => [definition.name, definition]));
  const normalized: Record<string, string | number | boolean> = {};
  for (const [name, value] of Object.entries(input)) {
    if (!isSettingField(name) || value === undefined) continue;
    const definition = supported.get(name);
    if (definition === undefined || !settingIsValid(definition, value)) return correction("setting_unsupported", `Setting ${name} is not supported by this adapter or has an invalid value.`);
    normalized[name] = value;
  }
  return { ok: true, value: normalized };
}

function mapAssets(input: Readonly<Record<string, unknown>>, assets: readonly ResolvedMediaAsset[], roles: Readonly<Record<string, AssetRole>>): MediaResult<readonly { readonly role: AssetRole; readonly asset: ResolvedMediaAsset }[], MediaCorrection> {
  const expected = Object.entries(roles).filter(([name]) => input[name] !== undefined);
  if (expected.length !== assets.length) return correction("asset_invalid", `Expected ${expected.length} resolved media asset(s), received ${assets.length}.`);
  const remaining = [...assets];
  const mapped = [];
  for (const [name, role] of expected) {
    const scalar = input[name];
    if (typeof scalar !== "string" || !scalar.startsWith("files:")) return correction("asset_invalid", `Asset ${name} must use a files: scalar.`);
    const path = scalar.slice("files:".length);
    const index = remaining.findIndex((asset) => asset.ref.path === path);
    if (index < 0) return correction("asset_invalid", `Resolved asset for ${name} was not provided exactly once.`);
    const [asset] = remaining.splice(index, 1);
    if (asset === undefined) return correction("asset_invalid", `Resolved asset for ${name} was not provided exactly once.`);
    mapped.push({ role, asset });
  }
  return remaining.length === 0 ? { ok: true, value: mapped } : correction("asset_invalid", "A resolved asset was not assigned to an input role.");
}

function settingIsValid(definition: MediaSettingDefinition, value: unknown): value is string | number | boolean {
  if (definition.kind === "enum") return typeof value === "string" && definition.values.includes(value);
  if (definition.kind === "integer") return typeof value === "number" && Number.isInteger(value) && value >= definition.min && value <= definition.max;
  if (definition.kind === "number") return typeof value === "number" && Number.isFinite(value) && value >= definition.min && value <= definition.max;
  if (definition.kind === "boolean") return typeof value === "boolean";
  return typeof value === "string" && value.length <= definition.maxLength;
}

/** Fold each provider-mapped setting into its declared providerOptions slot. */
function providerOptionsFromSettings(
  settings: Readonly<Record<string, string | number | boolean>>,
  definitions: readonly MediaSettingDefinition[],
): Readonly<Record<string, Readonly<Record<string, string | number | boolean>>>> {
  const byName = new Map(definitions.map((definition) => [definition.name, definition]));
  const options: Record<string, Record<string, string | number | boolean>> = {};
  for (const [name, value] of Object.entries(settings)) {
    const mapping = byName.get(name)?.mapping;
    if (mapping === undefined || mapping === "ai_sdk") continue;
    const mappedValue = mapping.values === undefined ? value : mapping.values[String(value)];
    if (mappedValue === undefined) continue; // settingIsValid already vetted enum membership
    (options[mapping.providerOptionsKey] ??= {})[mapping.field] = mappedValue;
  }
  return options;
}

function isControlField(name: string): boolean { return name === "model" || name === "max_cost_usd"; }
function isSettingField(name: string): boolean { return ["aspect_ratio", "size", "count", "style", "safety", "resolution", "duration_seconds", "fps", "generate_audio", "seed", "voice", "format", "speed", "language", "timestamps"].includes(name); }
function correction(code: MediaCorrection["code"], message: string): MediaResult<never, MediaCorrection> { return { ok: false, error: { code, message } }; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
