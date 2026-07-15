// ../../../../../tmp/agent-sdk-mirror-FS9Yl0/repo/platform/runtime-ai/gateway.ts
import { createGateway } from "ai";

// ../../../../../tmp/agent-sdk-mirror-FS9Yl0/repo/platform/runtime-ai/session-fetch.ts
var EVE_SESSION_HEADER = "x-zo-eve-session";
var EVE_TURN_HEADER = "x-zo-eve-turn";
var EVE_SUBAGENT_SESSION_HEADER = "x-zo-eve-subagent-session";
var EVE_CONTEXT_STORAGE_KEY = Symbol.for("eve.context-storage");
var SESSION_ID_KEY_NAME = "eve.sessionId";
var SESSION_KEY_NAME = "eve.session";
var PARENT_SESSION_KEY_NAME = "eve.parentSession";
function hasMethod(value, name) {
  return typeof value === "object" && value !== null && typeof value[name] === "function";
}
function ambientEveSessionId() {
  const value = ambientContextValue(SESSION_ID_KEY_NAME);
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
function ambientSessionParent() {
  const parent = ambientContextValue(PARENT_SESSION_KEY_NAME);
  if (typeof parent !== "object" || parent === null)
    return null;
  const rootSessionId = parent["rootSessionId"];
  const sessionId = parent["sessionId"];
  if (typeof rootSessionId !== "string" || rootSessionId.trim().length === 0)
    return null;
  if (typeof sessionId !== "string" || sessionId.trim().length === 0)
    return null;
  return { rootSessionId, sessionId };
}
function ambientEveTurnId() {
  const session = ambientContextValue(SESSION_KEY_NAME);
  if (typeof session !== "object" || session === null)
    return;
  const turn = session["turn"];
  if (typeof turn !== "object" || turn === null)
    return;
  const id = turn["id"];
  return typeof id === "string" && id.trim().length > 0 ? id : undefined;
}
function ambientContextValue(keyName) {
  const storage = Reflect.get(globalThis, EVE_CONTEXT_STORAGE_KEY);
  if (!hasMethod(storage, "getStore"))
    return;
  const store = storage.getStore();
  if (!hasMethod(store, "get"))
    return;
  return store.get({ name: keyName });
}
function eveSessionFetch(getSessionId = ambientEveSessionId, baseFetch = globalThis.fetch, getTurnId = ambientEveTurnId, getSessionParent = ambientSessionParent) {
  return Object.assign((input, init) => {
    const sessionId = getSessionId()?.trim();
    if (!sessionId)
      return baseFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const parent = getSessionParent();
    headers.set(EVE_SESSION_HEADER, parent?.rootSessionId ?? sessionId);
    const turnId = getTurnId()?.trim();
    if (turnId)
      headers.set(EVE_TURN_HEADER, turnId);
    else
      headers.delete(EVE_TURN_HEADER);
    if (parent)
      headers.set(EVE_SUBAGENT_SESSION_HEADER, sessionId);
    else
      headers.delete(EVE_SUBAGENT_SESSION_HEADER);
    return baseFetch(input, { ...init, headers });
  }, baseFetch);
}

// ../../../../../tmp/agent-sdk-mirror-FS9Yl0/repo/platform/runtime-ai/gateway-config.ts
var DEFAULT_ZO_AI_BASE_URL = "http://localhost:4000/runtime/ai/v4/ai";
var DEFAULT_ZO_AI_KEY = "dev-proxy";
var AGENT_TOKEN_HEADER = "x-zo-agent-token";
var AGENT_TOKEN_ENV = "ZO_AGENT_TOKEN";
function agentAuthHeaders(token = process.env[AGENT_TOKEN_ENV]) {
  const trimmed = token?.trim();
  return trimmed ? { [AGENT_TOKEN_HEADER]: trimmed } : {};
}
function resolveZoGatewayBaseUrl(baseURL = process.env.ZO_AI_BASE_URL) {
  const trimmed = baseURL?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_BASE_URL;
}
function resolveZoGatewayApiKey(apiKey = process.env.ZO_AI_KEY) {
  const trimmed = apiKey?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_KEY;
}
// ../../../../../tmp/agent-sdk-mirror-FS9Yl0/repo/platform/runtime-ai/catalog.ts
function resolveZoGatewayCatalogUrl(baseURL) {
  const url = new URL(resolveZoGatewayBaseUrl(baseURL));
  if (!/\/v4\/ai\/?$/u.test(url.pathname)) {
    throw new Error("ZO_AI_BASE_URL must end in /v4/ai to derive the authenticated media catalog endpoint");
  }
  url.pathname = url.pathname.replace(/\/v4\/ai\/?$/u, "/v1/models");
  url.search = "";
  url.hash = "";
  return url;
}
async function fetchMediaCatalog(options = {}) {
  const url = resolveZoGatewayCatalogUrl(options.baseURL);
  const controller = new AbortController;
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 1e4);
  const now = options.now ?? (() => new Date);
  const fetcher = eveSessionFetch(undefined, options.fetch);
  try {
    const response = await fetcher(url, {
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${resolveZoGatewayApiKey(options.apiKey)}`,
        ...agentAuthHeaders(),
        ...options.validators?.etag ? { "if-none-match": options.validators.etag } : {},
        ...options.validators?.lastModified ? { "if-modified-since": options.validators.lastModified } : {}
      }
    });
    const etag = response.headers.get("etag");
    const lastModified = response.headers.get("last-modified");
    const validators = { ...etag ? { etag } : {}, ...lastModified ? { lastModified } : {} };
    if (response.status === 304)
      return { status: "not_modified", validatedAt: now().toISOString(), validators };
    if (!response.ok)
      throw new Error(`Media catalog request failed (${response.status})`);
    const raw = await response.json();
    return { status: "modified", raw, fetchedAt: now().toISOString(), validators };
  } finally {
    clearTimeout(timeout);
  }
}

// ../../../../../tmp/agent-sdk-mirror-FS9Yl0/repo/platform/cloud-tools/media-catalog-parser.ts
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var scalarRecordArray = (value) => Array.isArray(value) && value.every((row) => isRecord(row) && Object.values(row).every((v) => ["string", "number", "boolean"].includes(typeof v))) ? value : undefined;
function parsePricing(value) {
  if (value === undefined || value === null)
    return null;
  if (!isRecord(value))
    return "invalid";
  const string = (key) => typeof value[key] === "string" ? value[key] : undefined;
  const imageDimensions = scalarRecordArray(value.image_dimension_quality_pricing);
  const videoDuration = scalarRecordArray(value.video_duration_pricing);
  const input = string("input");
  const output = string("output");
  const image = string("image");
  const speech = string("speech_input_character_cost");
  const transcription = string("transcription_duration_cost_per_second");
  return {
    ...input ? { inputPerTokenUsd: input } : {},
    ...output ? { outputPerTokenUsd: output } : {},
    ...image ? { imagePerOutputUsd: image } : {},
    ...imageDimensions ? { imageDimensions } : {},
    ...speech ? { speechPerCharacterUsd: speech } : {},
    ...transcription ? { transcriptionPerSecondUsd: transcription } : {},
    ...videoDuration ? { videoDuration } : {}
  };
}
function parseMediaCatalog(raw) {
  const rows = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.data) ? raw.data : null;
  if (rows === null)
    return { ok: false, error: "Catalog envelope must contain a data array" };
  const models = [];
  for (const row of rows) {
    if (!isRecord(row) || !isMediaKind(row.type))
      continue;
    const pricing = parsePricing(row.pricing);
    if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.description !== "string" || pricing === "invalid") {
      return { ok: false, error: `Malformed media catalog row${typeof row.id === "string" ? ` ${row.id}` : ""}` };
    }
    const capabilitiesKey = `${row.type}_capabilities`;
    const capabilities = isRecord(row[capabilitiesKey]) ? row[capabilitiesKey] : null;
    const operations = capabilities && Array.isArray(capabilities.supported_operations) ? capabilities.supported_operations.filter((v) => typeof v === "string") : [];
    models.push({ id: row.id, name: row.name, description: row.description, kind: row.type, pricing, reportedOperations: operations, rawCapabilities: capabilities });
  }
  return models.length === 0 ? { ok: false, error: "Catalog contains no valid media models" } : { ok: true, value: models };
}
function isMediaKind(value) {
  return value === "image" || value === "video" || value === "speech" || value === "transcription";
}

// ../../../../../tmp/agent-sdk-mirror-FS9Yl0/repo/platform/cloud-tools/media-catalog-snapshot.ts
import { createHash } from "node:crypto";
function canonical(value) {
  if (Array.isArray(value))
    return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
function mediaCatalogSnapshotId(models) {
  const ordered = [...models].sort((a, b) => a.id.localeCompare(b.id));
  return `sha256:${createHash("sha256").update(canonical(ordered)).digest("hex")}`;
}

// ../../../../../tmp/agent-sdk-mirror-FS9Yl0/repo/platform/cloud-tools/media-catalog-cache.ts
function createMediaCatalogCache(options) {
  const now = options.now ?? Date.now;
  const freshMs = options.freshMs ?? 5 * 60000;
  const staleMs = options.staleMs ?? 60 * 60000;
  if (!Number.isFinite(freshMs) || !Number.isFinite(staleMs) || freshMs < 0 || staleMs < freshMs)
    throw new Error("media catalog TTLs must be finite, nonnegative, and staleMs must be at least freshMs");
  let cached;
  let flight;
  const result = (stale) => cached ? { ok: true, value: { models: cached.models, lineage: { snapshotId: cached.snapshotId, fetchedAt: cached.fetchedAt, validatedAt: cached.validatedAt, stale, status: stale ? "stale" : "fresh" } } } : { ok: false, error: "No accepted media catalog snapshot is available" };
  return { async get() {
    const age = cached ? now() - cached.validatedMs : Infinity;
    if (age <= freshMs)
      return result(false);
    if (flight)
      return flight;
    flight = (async () => {
      try {
        const refreshed = await options.refresh(cached?.validators);
        if (refreshed.status === "not_modified") {
          if (!cached)
            return { ok: false, error: "Catalog returned 304 without a cached snapshot" };
          cached.validatedAt = refreshed.validatedAt ?? new Date(now()).toISOString();
          cached.validatedMs = now();
          cached.validators = mergeValidators(cached.validators, refreshed.validators);
          return result(false);
        }
        const parsed = parseMediaCatalog(refreshed.raw);
        if (!parsed.ok)
          return cached && age <= staleMs ? result(true) : parsed;
        const timestamp = refreshed.fetchedAt ?? new Date(now()).toISOString();
        cached = { models: parsed.value, snapshotId: mediaCatalogSnapshotId(parsed.value), fetchedAt: timestamp, validatedAt: timestamp, validatedMs: now(), validators: refreshed.validators };
        return result(false);
      } catch (error) {
        return cached && age <= staleMs ? result(true) : { ok: false, error: error instanceof Error ? error.message : "Catalog refresh failed" };
      } finally {
        flight = undefined;
      }
    })();
    return flight;
  } };
}
function mergeValidators(previous, next) {
  const merged = { ...previous, ...next };
  return Object.keys(merged).length === 0 ? undefined : merged;
}

// ../../../../../tmp/agent-sdk-mirror-FS9Yl0/repo/platform/cloud-tools/media-models.ts
import { defineTool } from "eve/tools";
import { z } from "zod";
var MediaModelsInputSchema = z.object({
  kind: z.enum(["image", "video", "speech", "transcription"]).optional(),
  operation: z.enum(["image.generate", "image.edit", "video.generate", "video.edit", "speech.generate", "audio.transcribe"]).optional(),
  query: z.string().trim().max(100).optional(),
  model: z.string().trim().min(1).optional().describe("Exact model id to inspect. Omit it to list models."),
  limit: z.number().int().min(1).max(50).default(12)
});
var DiscoveryModelSchema = z.object({
  id: z.string(),
  kind: z.enum(["image", "video", "speech", "transcription"]),
  availability: z.enum(["offered", "unverified", "unavailable"]),
  operations: z.array(z.string()),
  pricing: z.unknown().nullable()
});
var MediaModelsOutputSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("list"), catalog_snapshot_id: z.string().nullable(), fetched_at: z.string().nullable(), stale: z.boolean(), models: z.array(DiscoveryModelSchema) }),
  z.object({ mode: z.literal("inspect"), profile: z.unknown() })
]);
function mediaModelsTool(options) {
  return defineTool({
    description: "List current image, video, speech, and transcription models, or inspect exact capabilities and pricing before choosing advanced settings.",
    inputSchema: MediaModelsInputSchema,
    outputSchema: MediaModelsOutputSchema,
    async execute(input) {
      const loaded = await options.registry();
      if (!loaded.ok)
        throw new Error(`Media model discovery is unavailable: ${loaded.error}. Retry later.`);
      if (input.model) {
        const item = loaded.value.inspect(input.model);
        if (!item)
          throw new Error(`Unknown media model ${input.model}. Omit model to find current model ids.`);
        return { mode: "inspect", profile: compact(item) };
      }
      const matching = loaded.value.list({ ...input.kind ? { kind: input.kind } : {}, ...input.operation ? { operation: input.operation } : {}, ...input.query ? { query: input.query } : {} });
      const items = matching.slice(0, input.limit);
      const lineage = items[0]?.lineage;
      return { mode: "list", catalog_snapshot_id: lineage?.snapshotId ?? null, fetched_at: lineage?.fetchedAt ?? null, stale: lineage?.stale ?? false, models: items.map((item) => ({ id: item.id, kind: item.kind, availability: item.availability, operations: item.operations.map((op) => op.operation), pricing: item.pricing })) };
    }
  });
}
function compact(item) {
  if (!item)
    return null;
  return { id: item.id, name: item.name, kind: item.kind, availability: item.availability, catalog_snapshot_id: item.lineage.snapshotId, fetched_at: item.lineage.fetchedAt, stale: item.lineage.stale, adapter_revision: item.adapterRevision, verified_at: item.verifiedAt, pricing: item.pricing, operations: item.operations.map((op) => ({ operation: op.operation, inputs: op.inputs, settings: op.settings, outputs: op.outputs, provenance: op.provenance })) };
}

// ../../../../../tmp/agent-sdk-mirror-FS9Yl0/repo/platform/cloud-tools/media-adapters.ts
function adapter(modelId, operation, output, options = {}) {
  const acceptedKinds = options.acceptedKinds ?? [];
  const curatedSettings = options.settings ?? [];
  const assetRoles = options.assetRoles ?? {};
  return {
    modelId,
    operation,
    revision: "2026-07-12.2",
    verifiedAt: "2026-07-12",
    overlay(model) {
      const caps = model.rawCapabilities;
      const strings = (key) => caps && Array.isArray(caps[key]) ? caps[key].filter((value) => typeof value === "string") : undefined;
      const numbers = (key) => caps && Array.isArray(caps[key]) ? caps[key].filter((value) => typeof value === "number" && Number.isFinite(value)) : undefined;
      const resolutions = strings("supported_resolutions");
      const aspectRatios = strings("supported_aspect_ratios");
      const durations = numbers("supported_durations_seconds");
      const fps = numbers("supported_fps");
      const inputLimits = caps?.input_limits;
      const inputRecord = isRecord2(inputLimits) ? inputLimits : undefined;
      const relevantLimit = acceptedKinds.map((kind) => inputRecord?.[kind]).find(isRecord2);
      const maxAssets = typeof relevantLimit?.max_count === "number" ? relevantLimit.max_count : undefined;
      const formats = Array.isArray(relevantLimit?.supported_formats) ? relevantLimit.supported_formats.filter((value) => typeof value === "string") : undefined;
      const reportedSettings = [
        ...resolutions?.length ? [{ kind: "enum", name: "resolution", description: "Output resolution", costEffect: "changes", mapping: "ai_sdk", values: resolutions }] : [],
        ...aspectRatios?.length ? [{ kind: "enum", name: "aspect_ratio", description: "Output aspect ratio", costEffect: "may_change", mapping: "ai_sdk", values: aspectRatios }] : [],
        ...durations?.length ? [{ kind: "integer", name: "duration_seconds", description: "Output duration in seconds", costEffect: "changes", mapping: "ai_sdk", min: Math.min(...durations), max: Math.max(...durations) }] : [],
        ...fps?.length ? [{ kind: "integer", name: "fps", description: "Frames per second", costEffect: "may_change", mapping: "ai_sdk", min: Math.min(...fps), max: Math.max(...fps) }] : [],
        ...typeof caps?.generate_audio === "boolean" ? [{ kind: "boolean", name: "generate_audio", description: "Generate synchronized audio", costEffect: "may_change", mapping: "ai_sdk", default: caps.generate_audio }] : []
      ];
      const reportedNames = new Set(reportedSettings.map(({ name }) => name));
      const settings = [...reportedSettings, ...curatedSettings.filter(({ name }) => !reportedNames.has(name))];
      return {
        operation,
        inputs: { acceptedKinds, ...maxAssets === undefined ? {} : { maxAssets }, ...formats?.length ? { supportedFormats: formats } : {} },
        outputs: { kind: output },
        settings,
        provenance: {
          operation: "adapter",
          inputs: inputRecord ? "gateway" : acceptedKinds.length ? "adapter" : "unknown",
          settings: curatedSettings.length ? "adapter" : reportedSettings.length ? "gateway" : "unknown",
          pricing: "gateway"
        }
      };
    },
    mapRequest(input, assets) {
      if (!isRecord2(input))
        return correction("setting_unsupported", "Media input must be an object.");
      const settings = normalizeSettings(input, curatedSettings);
      if (!settings.ok)
        return settings;
      const mappedAssets = mapAssets(input, assets, assetRoles);
      if (!mappedAssets.ok)
        return mappedAssets;
      return {
        ok: true,
        value: {
          input: Object.fromEntries(Object.entries(input).filter(([name]) => !isControlField(name) && !isSettingField(name) && !(name in assetRoles))),
          settings: settings.value,
          providerOptions: providerOptionsFromSettings(settings.value, curatedSettings),
          assets: mappedAssets.value.map(({ asset }) => asset),
          mediaInputs: mappedAssets.value
        }
      };
    }
  };
}
var IMAGE_SETTINGS = [
  { kind: "enum", name: "aspect_ratio", description: "Output aspect ratio", costEffect: "may_change", mapping: "ai_sdk", values: ["1:1", "16:9", "9:16", "4:3", "3:4"] },
  { kind: "string", name: "size", description: "Output dimensions as width x height", costEffect: "changes", mapping: "ai_sdk", maxLength: 24 },
  { kind: "integer", name: "count", description: "Number of output images", costEffect: "changes", mapping: "ai_sdk", min: 1, max: 4 },
  { kind: "integer", name: "seed", description: "Deterministic generation seed", costEffect: "none", mapping: "ai_sdk", min: 0, max: 2147483647 },
  {
    kind: "enum",
    name: "safety",
    description: "Content moderation strictness",
    costEffect: "none",
    mapping: { providerOptionsKey: "blackForestLabs", field: "safetyTolerance", values: { strict: 0, standard: 2, relaxed: 4 } },
    values: ["strict", "standard", "relaxed"]
  }
];
var IMAGE_EDIT_SETTINGS = IMAGE_SETTINGS.filter(({ name }) => name === "aspect_ratio" || name === "safety");
var VIDEO_SETTINGS = [
  { kind: "enum", name: "aspect_ratio", description: "Output aspect ratio", costEffect: "may_change", mapping: "ai_sdk", values: ["16:9", "9:16", "1:1"] },
  { kind: "enum", name: "resolution", description: "Output resolution", costEffect: "changes", mapping: "ai_sdk", values: ["480x854", "854x480", "720x1280", "1280x720", "1080x1920", "1920x1080"] },
  { kind: "integer", name: "duration_seconds", description: "Output duration in seconds", costEffect: "changes", mapping: "ai_sdk", min: 1, max: 30 },
  { kind: "integer", name: "fps", description: "Frames per second", costEffect: "may_change", mapping: "ai_sdk", min: 1, max: 60 },
  { kind: "boolean", name: "generate_audio", description: "Generate synchronized audio", costEffect: "may_change", mapping: "ai_sdk" },
  { kind: "integer", name: "seed", description: "Deterministic generation seed", costEffect: "none", mapping: "ai_sdk", min: 0, max: 2147483647 }
];
var SPEECH_SETTINGS = [
  { kind: "enum", name: "voice", description: "Voice", costEffect: "none", mapping: "ai_sdk", values: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] },
  { kind: "enum", name: "format", description: "Audio format", costEffect: "none", mapping: "ai_sdk", values: ["mp3", "wav"] },
  { kind: "number", name: "speed", description: "Speaking speed", costEffect: "none", mapping: "ai_sdk", min: 0.25, max: 4 },
  { kind: "string", name: "style", description: "Delivery instructions", costEffect: "none", mapping: "ai_sdk", maxLength: 500 },
  { kind: "string", name: "language", description: "ISO language code", costEffect: "none", mapping: "ai_sdk", maxLength: 16 }
];
var TRANSCRIPTION_SETTINGS = [
  { kind: "enum", name: "timestamps", description: "Timestamp detail", costEffect: "none", mapping: "ai_sdk", values: ["none", "segment"] }
];
var MEDIA_PROVIDER_ADAPTERS = [
  adapter("bfl/flux-2-pro", "image.generate", "image", { settings: IMAGE_SETTINGS }),
  adapter("bfl/flux-kontext-pro", "image.generate", "image", { acceptedKinds: ["image"], settings: IMAGE_SETTINGS, assetRoles: { input_asset: "reference", reference_asset: "reference" } }),
  adapter("bfl/flux-kontext-pro", "image.edit", "image", { acceptedKinds: ["image"], settings: IMAGE_EDIT_SETTINGS, assetRoles: { input_asset: "source", mask_asset: "mask", reference_asset: "reference" } }),
  adapter("bytedance/seedance-2.0-fast", "video.generate", "video", { acceptedKinds: ["image"], settings: VIDEO_SETTINGS, assetRoles: { input_asset: "source", start_frame_asset: "start_frame", end_frame_asset: "end_frame", reference_asset: "reference" } }),
  adapter("xai/grok-imagine-video", "video.generate", "video", { acceptedKinds: ["image"], settings: VIDEO_SETTINGS, assetRoles: { input_asset: "source", start_frame_asset: "start_frame", end_frame_asset: "end_frame", reference_asset: "reference" } }),
  adapter("xai/grok-imagine-video", "video.edit", "video", { acceptedKinds: ["video"], assetRoles: { input_asset: "source" } }),
  adapter("openai/tts-1", "speech.generate", "audio", { settings: SPEECH_SETTINGS }),
  adapter("openai/whisper-1", "audio.transcribe", "transcript", { acceptedKinds: ["audio"], settings: TRANSCRIPTION_SETTINGS, assetRoles: { input_asset: "source" } })
];
function normalizeSettings(input, definitions) {
  const supported = new Map(definitions.map((definition) => [definition.name, definition]));
  const normalized = {};
  for (const [name, value] of Object.entries(input)) {
    if (!isSettingField(name) || value === undefined)
      continue;
    const definition = supported.get(name);
    if (definition === undefined || !settingIsValid(definition, value))
      return correction("setting_unsupported", `Setting ${name} is not supported by this adapter or has an invalid value.`);
    normalized[name] = value;
  }
  return { ok: true, value: normalized };
}
function mapAssets(input, assets, roles) {
  const expected = Object.entries(roles).filter(([name]) => input[name] !== undefined);
  if (expected.length !== assets.length)
    return correction("asset_invalid", `Expected ${expected.length} resolved media asset(s), received ${assets.length}.`);
  const remaining = [...assets];
  const mapped = [];
  for (const [name, role] of expected) {
    const scalar = input[name];
    if (typeof scalar !== "string" || !scalar.startsWith("files:"))
      return correction("asset_invalid", `Asset ${name} must use a files: scalar.`);
    const path = scalar.slice("files:".length);
    const index = remaining.findIndex((asset2) => asset2.ref.path === path);
    if (index < 0)
      return correction("asset_invalid", `Resolved asset for ${name} was not provided exactly once.`);
    const [asset] = remaining.splice(index, 1);
    if (asset === undefined)
      return correction("asset_invalid", `Resolved asset for ${name} was not provided exactly once.`);
    mapped.push({ role, asset });
  }
  return remaining.length === 0 ? { ok: true, value: mapped } : correction("asset_invalid", "A resolved asset was not assigned to an input role.");
}
function settingIsValid(definition, value) {
  if (definition.kind === "enum")
    return typeof value === "string" && definition.values.includes(value);
  if (definition.kind === "integer")
    return typeof value === "number" && Number.isInteger(value) && value >= definition.min && value <= definition.max;
  if (definition.kind === "number")
    return typeof value === "number" && Number.isFinite(value) && value >= definition.min && value <= definition.max;
  if (definition.kind === "boolean")
    return typeof value === "boolean";
  return typeof value === "string" && value.length <= definition.maxLength;
}
function providerOptionsFromSettings(settings, definitions) {
  const byName = new Map(definitions.map((definition) => [definition.name, definition]));
  const options = {};
  for (const [name, value] of Object.entries(settings)) {
    const mapping = byName.get(name)?.mapping;
    if (mapping === undefined || mapping === "ai_sdk")
      continue;
    const mappedValue = mapping.values === undefined ? value : mapping.values[String(value)];
    if (mappedValue === undefined)
      continue;
    (options[mapping.providerOptionsKey] ??= {})[mapping.field] = mappedValue;
  }
  return options;
}
function isControlField(name) {
  return name === "model" || name === "max_cost_usd";
}
function isSettingField(name) {
  return ["aspect_ratio", "size", "count", "style", "safety", "resolution", "duration_seconds", "fps", "generate_audio", "seed", "voice", "format", "speed", "language", "timestamps"].includes(name);
}
function correction(code, message) {
  return { ok: false, error: { code, message } };
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../../../../../tmp/agent-sdk-mirror-FS9Yl0/repo/platform/cloud-tools/media-registry.ts
function createMediaRegistry(models, lineage, adapters = MEDIA_PROVIDER_ADAPTERS) {
  const live = new Map(models.map((model) => [model.id, model]));
  const profile = (id) => {
    const model = live.get(id);
    const relevant = adapters.filter((adapter2) => adapter2.modelId === id);
    if (!model && relevant.length === 0)
      return null;
    const firstAdapter = relevant[0];
    if (!model && !firstAdapter)
      return null;
    const basis = model ?? absentModel(id, firstAdapter);
    const operations = model ? relevant.map((adapter2) => adapter2.overlay(model)) : [];
    const base = { id, name: basis.name, description: basis.description, availability: model ? relevant.length ? "offered" : "unverified" : "unavailable", pricing: basis.pricing, adapterRevision: relevant[0]?.revision ?? null, verifiedAt: relevant[0]?.verifiedAt ?? null, lineage };
    switch (basis.kind) {
      case "image":
        return { ...base, kind: "image", operations: operations.filter(isImageOperation) };
      case "video":
        return { ...base, kind: "video", operations: operations.filter(isVideoOperation) };
      case "speech":
        return { ...base, kind: "speech", operations: operations.filter(isSpeechOperation) };
      case "transcription":
        return { ...base, kind: "transcription", operations: operations.filter(isTranscriptionOperation) };
    }
  };
  const all = models.map((model) => profile(model.id)).filter((item) => item !== null);
  return {
    list(filters = {}) {
      const q = filters.query?.toLowerCase();
      return all.filter((item) => (!filters.kind || item.kind === filters.kind) && (!filters.operation || item.operations.some((op) => op.operation === filters.operation)) && (!q || `${item.id} ${item.name} ${item.description}`.toLowerCase().includes(q)));
    },
    inspect: profile,
    executable(modelId, operation) {
      const found = profile(modelId);
      const adapter2 = adapters.find((candidate) => candidate.modelId === modelId && candidate.operation === operation);
      return found?.availability === "offered" && adapter2 && found.operations.some((op) => op.operation === operation) ? { profile: found, adapter: adapter2 } : null;
    }
  };
}
function absentModel(id, adapter2) {
  if (!adapter2)
    throw new Error(`Invariant: ${id} has neither a catalog row nor adapter`);
  return { id, name: id, description: "Known adapter model absent from the current Gateway catalog.", kind: kindFor(adapter2.operation), pricing: null, reportedOperations: [], rawCapabilities: null };
}
function isImageOperation(op) {
  return op.operation === "image.generate" || op.operation === "image.edit";
}
function isVideoOperation(op) {
  return op.operation === "video.generate" || op.operation === "video.edit";
}
function isSpeechOperation(op) {
  return op.operation === "speech.generate";
}
function isTranscriptionOperation(op) {
  return op.operation === "audio.transcribe";
}
function kindFor(operation) {
  if (operation.startsWith("image."))
    return "image";
  if (operation.startsWith("video."))
    return "video";
  if (operation === "speech.generate")
    return "speech";
  return "transcription";
}

// ../../../../../tmp/agent-sdk-mirror-FS9Yl0/repo/platform/cloud-tools/media-models-default.ts
var catalog = createMediaCatalogCache({
  refresh: (validators) => fetchMediaCatalog(validators === undefined ? {} : { validators })
});
async function defaultMediaRegistry() {
  const loaded = await catalog.get();
  return loaded.ok ? { ok: true, value: createMediaRegistry(loaded.value.models, loaded.value.lineage) } : loaded;
}
var media_models_default_default = mediaModelsTool({ registry: defaultMediaRegistry });
export {
  mediaModelsTool,
  defaultMediaRegistry,
  media_models_default_default as default
};
