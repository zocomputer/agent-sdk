// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/image.ts
import { randomUUID } from "node:crypto";
import { generateImage } from "ai";
import { defineTool as defineTool2 } from "eve/tools";
import { z as z5 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/runtime-ai/gateway.ts
import { createGateway } from "ai";

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/runtime-ai/session-fetch.ts
var EVE_SESSION_HEADER = "x-zo-eve-session";
var EVE_TURN_HEADER = "x-zo-eve-turn";
var EVE_SUBAGENT_SESSION_HEADER = "x-zo-eve-subagent-session";
var EVE_CONTEXT_STORAGE_KEY = Symbol.for("eve.context-storage");
var SESSION_ID_KEY_NAME = "eve.sessionId";
var SESSION_KEY_NAME = "eve.session";
var SESSION_CAPABILITY_ATTRIBUTE = "zoSessionCapability";
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
function ambientSessionCapability() {
  const session = ambientContextValue(SESSION_KEY_NAME);
  if (typeof session !== "object" || session === null)
    return;
  const auth = session["auth"];
  if (typeof auth !== "object" || auth === null)
    return;
  const authRecord = auth;
  for (const key of ["current", "initiator"]) {
    const context = authRecord[key];
    if (typeof context !== "object" || context === null)
      continue;
    const attributes = context["attributes"];
    if (typeof attributes !== "object" || attributes === null)
      continue;
    const capability = attributes[SESSION_CAPABILITY_ATTRIBUTE];
    if (typeof capability === "string" && capability.trim().length > 0) {
      return capability;
    }
  }
  return;
}
function ambientControlPlaneSessionId() {
  return ambientSessionParent()?.rootSessionId ?? ambientEveSessionId();
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

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/runtime-ai/stream-guards.ts
var DEFAULT_STREAM_GUARDS = {
  firstByteMs: 60000,
  idleMs: 180000
};
function withStreamGuards(baseFetch, options = DEFAULT_STREAM_GUARDS) {
  const guarded = async (input, init) => {
    const controller = new AbortController;
    const outer = init?.signal;
    if (outer != null) {
      if (outer.aborted)
        controller.abort(outer.reason);
      else
        outer.addEventListener("abort", () => controller.abort(outer.reason), { once: true });
    }
    const firstByteTimer = setTimeout(() => {
      controller.abort(new Error(`gateway response headers not received within ${options.firstByteMs}ms`));
    }, options.firstByteMs);
    let response;
    try {
      response = await baseFetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(firstByteTimer);
    }
    const body = response.body;
    if (body === null)
      return response;
    const reader = body.getReader();
    const guarded2 = new ReadableStream({
      async pull(streamController) {
        let idleTimer;
        const idle = new Promise((_, reject) => {
          idleTimer = setTimeout(() => {
            const reason = new Error(`gateway stream idle for ${options.idleMs}ms`);
            controller.abort(reason);
            reject(reason);
          }, options.idleMs);
        });
        try {
          const result = await Promise.race([reader.read(), idle]);
          if (result.done)
            streamController.close();
          else
            streamController.enqueue(result.value);
        } catch (error) {
          await reader.cancel(error).catch(() => {});
          throw error;
        } finally {
          clearTimeout(idleTimer);
        }
      },
      async cancel(reason) {
        await reader.cancel(reason).catch(() => {});
      }
    });
    return new Response(guarded2, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };
  return Object.assign(guarded, { preconnect: globalThis.fetch.preconnect });
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/runtime-ai/gateway-config.ts
var ZO_TOOL_HEADER = "x-zo-tool";
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
function zoGatewaySettings(options = {}) {
  return {
    ...options,
    headers: { ...agentAuthHeaders(), ...options.headers },
    apiKey: resolveZoGatewayApiKey(options.apiKey),
    baseURL: resolveZoGatewayBaseUrl(options.baseURL),
    fetch: withStreamGuards(eveSessionFetch(undefined, options.fetch))
  };
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/runtime-ai/gateway.ts
function zoGateway(options = {}) {
  return createGateway(zoGatewaySettings(options));
}
// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/runtime-ai/catalog.ts
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
// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/asset-path.ts
import { z } from "zod";
var DEFAULT_ASSET_OUTPUT_DIR = "generated";
var OutputDirSchema = z.string().trim().min(1).max(200).regex(/^(?!\/)(?!.*\/$)(?!.*\/\/)(?!.*(?:^|\/)(?:\.|\.\.)(?:\/|$))[A-Za-z0-9._/-]+$/u, "Use a relative state file path without empty, . or .. segments.");
var MEDIA_TYPE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov"
};
function extensionForMediaType(mediaType) {
  return MEDIA_TYPE_EXTENSIONS[mediaType] ?? "bin";
}
function slugForPrompt(prompt, fallback = "asset") {
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return slug.length > 0 ? slug : fallback;
}
function normalizedOutputDir(outputDir) {
  const trimmed = outputDir?.trim();
  const dir = trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ASSET_OUTPUT_DIR;
  const withoutTrailingSlash = dir.replace(/\/+$/g, "");
  return withoutTrailingSlash.length > 0 ? withoutTrailingSlash : DEFAULT_ASSET_OUTPUT_DIR;
}
function assetOutputPath(input) {
  return `${normalizedOutputDir(input.outputDir)}/${slugForPrompt(input.prompt, input.fallbackSlug)}-${input.id}.${extensionForMediaType(input.mediaType)}`;
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/media-asset.ts
var ASSET_SCALAR_PREFIX = "files:";
function formatMediaAssetRef(ref, declarationName = "files") {
  assertDeclaration(ref.declarationName, declarationName);
  return `${ASSET_SCALAR_PREFIX}${normalizeMediaAssetPath(ref.path)}`;
}
function parseMediaAssetRef(value, declarationName = "files") {
  if (!value.startsWith(ASSET_SCALAR_PREFIX))
    return null;
  try {
    return Object.freeze({
      type: "state_asset",
      declarationName,
      path: normalizeMediaAssetPath(value.slice(ASSET_SCALAR_PREFIX.length))
    });
  } catch {
    return null;
  }
}
function normalizeMediaAssetPath(path) {
  if (path.length === 0 || path.startsWith("/") || path.includes("\\")) {
    throw new Error("media asset path must be a non-empty relative POSIX path");
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new Error("media asset path must not contain empty, . or .. segments");
  }
  return path;
}
function assertMediaAssetRef(ref, declarationName) {
  assertDeclaration(ref.declarationName, declarationName);
  return Object.freeze({
    type: "state_asset",
    declarationName,
    path: normalizeMediaAssetPath(ref.path),
    ...ref.integrity === undefined ? {} : { integrity: ref.integrity },
    ...ref.contentType === undefined ? {} : { contentType: ref.contentType },
    ...ref.bytes === undefined ? {} : { bytes: ref.bytes }
  });
}
function sniffMediaAsset(ref, body) {
  const detected = detectMediaType(body);
  if (detected === null)
    return null;
  return Object.freeze({
    ref: Object.freeze({ ...ref, contentType: detected.contentType, bytes: body.byteLength }),
    body,
    kind: detected.kind,
    contentType: detected.contentType,
    bytes: body.byteLength
  });
}
function assertDeclaration(actual, configured) {
  if (actual !== configured) {
    throw new Error(`media asset must use the configured "${configured}" files declaration`);
  }
}
function detectMediaType(bytes) {
  if (startsWith(bytes, [137, 80, 78, 71, 13, 10, 26, 10]))
    return image("image/png");
  if (startsWith(bytes, [255, 216, 255]))
    return image("image/jpeg");
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")
    return image("image/gif");
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP")
    return image("image/webp");
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (["M4A ", "M4B ", "M4P "].includes(brand))
      return audio("audio/mp4");
    return video("video/mp4");
  }
  if (startsWith(bytes, [26, 69, 223, 163]))
    return video("video/webm");
  if (ascii(bytes, 0, 4) === "OggS")
    return audio("audio/ogg");
  if (ascii(bytes, 0, 4) === "fLaC")
    return audio("audio/flac");
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE")
    return audio("audio/wav");
  if (ascii(bytes, 0, 3) === "ID3" || bytes[0] === 255 && ((bytes[1] ?? 0) & 224) === 224)
    return audio("audio/mpeg");
  return null;
}
function image(contentType) {
  return { kind: "image", contentType };
}
function video(contentType) {
  return { kind: "video", contentType };
}
function audio(contentType) {
  return { kind: "audio", contentType };
}
function startsWith(bytes, prefix) {
  return prefix.every((byte, index) => bytes[index] === byte);
}
function ascii(bytes, offset, length) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/media-preflight.ts
function createMediaPreflight(options) {
  const run = async (request) => {
    const registry = await options.registry();
    if (!registry.ok)
      return correction("catalog_unavailable", registry.error);
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
    if (!assets.ok)
      return assets;
    const operationProfile = executable.profile.operations.find((candidate) => candidate.operation === request.operation);
    if (!operationProfile)
      return correction("operation_unsupported", `Model ${modelId} no longer supports ${request.operation}.`);
    const invalidAsset = validateAssets(assets.value, operationProfile.inputs);
    if (invalidAsset !== null)
      return correction("asset_invalid", invalidAsset);
    const invalidSetting = validateSettings(options.selectSettings?.(request.operation, request.input) ?? {}, operationProfile.settings);
    if (invalidSetting !== null)
      return correction("setting_unsupported", invalidSetting);
    const adapter = executable.adapter;
    const mapped = adapter.mapRequest(request.input, assets.value);
    if (!mapped.ok)
      return mapped;
    const estimationInput = estimationSource(request.input, mapped.value);
    const estimate = options.estimate?.(executable.profile, request.operation, estimationInput) ?? estimateMediaCost(executable.profile, request.operation, estimationInput);
    const approve = options.approve ?? defaultCostApproval;
    if (!approve(estimate))
      return correction("cost_rejected", "Estimated media cost exceeds the configured policy; choose a lower-cost model or settings.");
    return { ok: true, value: { profile: executable.profile, adapter, mappedCall: mapped.value, estimate, lineage: { operation: request.operation, concreteModelId: modelId, catalogSnapshotId: executable.profile.lineage.snapshotId, catalogStatus: executable.profile.lineage.status, adapterRevision: adapter.revision, estimate } } };
  };
  return { run };
}
function estimationSource(input, mappedCall) {
  if (!isRecord(mappedCall) || !isRecord(mappedCall.settings))
    return input;
  return { ...isRecord(input) ? input : {}, ...mappedCall.settings };
}
function estimateMediaCost(profile, operation, input) {
  const pricing = profile.pricing;
  if (pricing === null || !isRecord(input))
    return { confidence: "unknown" };
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
    if (duration !== null && rates.length > 0)
      return { confidence: "range", minUsd: Math.min(...rates) * duration, maxUsd: Math.max(...rates) * duration };
  }
  return { confidence: "unknown" };
}
function defaultCostApproval(estimate) {
  const configured = Number(process.env.ZO_MEDIA_MAX_COST_USD);
  if (!Number.isFinite(configured) || configured < 0)
    return true;
  if (estimate.confidence === "unknown")
    return false;
  return (estimate.confidence === "exact" ? estimate.amountUsd : estimate.maxUsd) <= configured;
}
function validateAssets(assets, capabilities) {
  if (capabilities.maxAssets !== undefined && assets.length > capabilities.maxAssets)
    return `This model accepts at most ${capabilities.maxAssets} media asset(s).`;
  for (const asset of assets) {
    if (!capabilities.acceptedKinds.includes(asset.kind))
      return `This operation does not accept ${asset.kind} assets.`;
    if (capabilities.maxBytesPerAsset !== undefined && asset.bytes > capabilities.maxBytesPerAsset)
      return `Asset ${asset.ref.path} exceeds the ${capabilities.maxBytesPerAsset}-byte model limit.`;
    if (capabilities.supportedFormats !== undefined && !capabilities.supportedFormats.includes(asset.contentType))
      return `Asset ${asset.ref.path} has unsupported format ${asset.contentType}.`;
  }
  return null;
}
function validateSettings(settings, definitions) {
  const supported = new Map(definitions.map((definition) => [definition.name, definition]));
  for (const [name, value] of Object.entries(settings)) {
    if (value === undefined)
      continue;
    const definition = supported.get(name);
    if (definition === undefined)
      return `Setting ${name} is not supported by this model and operation.`;
    if (definition.kind === "enum" && (typeof value !== "string" || !definition.values.includes(value)))
      return `Setting ${name} must be one of: ${definition.values.join(", ")}.`;
    if ((definition.kind === "integer" || definition.kind === "number") && (typeof value !== "number" || !Number.isFinite(value) || value < definition.min || value > definition.max || definition.kind === "integer" && !Number.isInteger(value)))
      return `Setting ${name} is outside its supported range.`;
    if (definition.kind === "boolean" && typeof value !== "boolean")
      return `Setting ${name} must be boolean.`;
    if (definition.kind === "string" && (typeof value !== "string" || value.length > definition.maxLength))
      return `Setting ${name} is invalid or too long.`;
  }
  return null;
}
function correction(code, message) {
  return { ok: false, error: { code, message } };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/media-catalog-parser.ts
var isRecord2 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var scalarRecordArray = (value) => Array.isArray(value) && value.every((row) => isRecord2(row) && Object.values(row).every((v) => ["string", "number", "boolean"].includes(typeof v))) ? value : undefined;
function parsePricing(value) {
  if (value === undefined || value === null)
    return null;
  if (!isRecord2(value))
    return "invalid";
  const string = (key) => typeof value[key] === "string" ? value[key] : undefined;
  const imageDimensions = scalarRecordArray(value.image_dimension_quality_pricing);
  const videoDuration = scalarRecordArray(value.video_duration_pricing);
  const input = string("input");
  const output = string("output");
  const image2 = string("image");
  const speech = string("speech_input_character_cost");
  const transcription = string("transcription_duration_cost_per_second");
  return {
    ...input ? { inputPerTokenUsd: input } : {},
    ...output ? { outputPerTokenUsd: output } : {},
    ...image2 ? { imagePerOutputUsd: image2 } : {},
    ...imageDimensions ? { imageDimensions } : {},
    ...speech ? { speechPerCharacterUsd: speech } : {},
    ...transcription ? { transcriptionPerSecondUsd: transcription } : {},
    ...videoDuration ? { videoDuration } : {}
  };
}
function parseMediaCatalog(raw) {
  const rows = Array.isArray(raw) ? raw : isRecord2(raw) && Array.isArray(raw.data) ? raw.data : null;
  if (rows === null)
    return { ok: false, error: "Catalog envelope must contain a data array" };
  const models = [];
  for (const row of rows) {
    if (!isRecord2(row) || !isMediaKind(row.type))
      continue;
    const pricing = parsePricing(row.pricing);
    if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.description !== "string" || pricing === "invalid") {
      return { ok: false, error: `Malformed media catalog row${typeof row.id === "string" ? ` ${row.id}` : ""}` };
    }
    const capabilitiesKey = `${row.type}_capabilities`;
    const capabilities = isRecord2(row[capabilitiesKey]) ? row[capabilitiesKey] : null;
    const operations = capabilities && Array.isArray(capabilities.supported_operations) ? capabilities.supported_operations.filter((v) => typeof v === "string") : [];
    models.push({ id: row.id, name: row.name, description: row.description, kind: row.type, pricing, reportedOperations: operations, rawCapabilities: capabilities });
  }
  return models.length === 0 ? { ok: false, error: "Catalog contains no valid media models" } : { ok: true, value: models };
}
function isMediaKind(value) {
  return value === "image" || value === "video" || value === "speech" || value === "transcription";
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/media-catalog-snapshot.ts
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

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/media-catalog-cache.ts
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

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/media-models.ts
import { defineTool } from "eve/tools";
import { z as z2 } from "zod";
var MediaModelsInputSchema = z2.object({
  kind: z2.enum(["image", "video", "speech", "transcription"]).optional(),
  operation: z2.enum(["image.generate", "image.edit", "video.generate", "video.edit", "speech.generate", "audio.transcribe"]).optional(),
  query: z2.string().trim().max(100).optional(),
  model: z2.string().trim().min(1).optional().describe("Exact model id to inspect. Omit it to list models."),
  limit: z2.number().int().min(1).max(50).default(12)
});
var DiscoveryModelSchema = z2.object({
  id: z2.string(),
  kind: z2.enum(["image", "video", "speech", "transcription"]),
  availability: z2.enum(["offered", "unverified", "unavailable"]),
  operations: z2.array(z2.string()),
  pricing: z2.unknown().nullable()
});
var MediaModelsOutputSchema = z2.discriminatedUnion("mode", [
  z2.object({ mode: z2.literal("list"), catalog_snapshot_id: z2.string().nullable(), fetched_at: z2.string().nullable(), stale: z2.boolean(), models: z2.array(DiscoveryModelSchema) }),
  z2.object({ mode: z2.literal("inspect"), profile: z2.unknown() })
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

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/media-adapters.ts
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
      const inputRecord = isRecord3(inputLimits) ? inputLimits : undefined;
      const relevantLimit = acceptedKinds.map((kind) => inputRecord?.[kind]).find(isRecord3);
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
      if (!isRecord3(input))
        return correction2("setting_unsupported", "Media input must be an object.");
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
      return correction2("setting_unsupported", `Setting ${name} is not supported by this adapter or has an invalid value.`);
    normalized[name] = value;
  }
  return { ok: true, value: normalized };
}
function mapAssets(input, assets, roles) {
  const expected = Object.entries(roles).filter(([name]) => input[name] !== undefined);
  if (expected.length !== assets.length)
    return correction2("asset_invalid", `Expected ${expected.length} resolved media asset(s), received ${assets.length}.`);
  const remaining = [...assets];
  const mapped = [];
  for (const [name, role] of expected) {
    const scalar = input[name];
    if (typeof scalar !== "string" || !scalar.startsWith("files:"))
      return correction2("asset_invalid", `Asset ${name} must use a files: scalar.`);
    const path = scalar.slice("files:".length);
    const index = remaining.findIndex((asset2) => asset2.ref.path === path);
    if (index < 0)
      return correction2("asset_invalid", `Resolved asset for ${name} was not provided exactly once.`);
    const [asset] = remaining.splice(index, 1);
    if (asset === undefined)
      return correction2("asset_invalid", `Resolved asset for ${name} was not provided exactly once.`);
    mapped.push({ role, asset });
  }
  return remaining.length === 0 ? { ok: true, value: mapped } : correction2("asset_invalid", "A resolved asset was not assigned to an input role.");
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
function correction2(code, message) {
  return { ok: false, error: { code, message } };
}
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/media-registry.ts
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

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/media-models-default.ts
var catalog = createMediaCatalogCache({
  refresh: (validators) => fetchMediaCatalog(validators === undefined ? {} : { validators })
});
async function defaultMediaRegistry() {
  const loaded = await catalog.get();
  return loaded.ok ? { ok: true, value: createMediaRegistry(loaded.value.models, loaded.value.lineage) } : loaded;
}
var media_models_default_default = mediaModelsTool({ registry: defaultMediaRegistry });

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/image-lane.ts
var IMAGE_ASSET_MAX_BYTES = 20 * 1024 * 1024;
function createImagePreflight(options) {
  return createMediaPreflight({
    registry: options.registry ?? defaultMediaRegistry,
    selectModel: (_operation, input) => readImageInput(input).model ?? options.defaultModel,
    selectSettings: (_operation, input) => {
      const parsed = readImageInput(input);
      return {
        ...parsed.aspect_ratio === undefined ? {} : { aspect_ratio: parsed.aspect_ratio },
        ...parsed.size === undefined ? {} : { size: parsed.size },
        ...parsed.count === undefined ? {} : { count: parsed.count },
        ...parsed.seed === undefined ? {} : { seed: parsed.seed },
        ...parsed.safety === undefined ? {} : { safety: parsed.safety }
      };
    },
    resolveAssets: async (input) => resolveImageAssets(options.assetStore, readImageInput(input))
  });
}
function normalizedMappedCall(value, fallbackInput) {
  if (isRecord4(value) && Array.isArray(value.assets) && !Array.isArray(value.mediaInputs) && isRecord4(fallbackInput)) {
    const assets2 = value.assets.filter(isResolvedMediaAsset);
    if (assets2.length !== value.assets.length)
      throw new Error("The media adapter returned malformed media inputs; no provider call was made.");
    const roles = assetRoles(fallbackInput);
    return {
      input: fallbackInput,
      settings: scalarSettings(fallbackInput),
      providerOptions: {},
      assets: assets2,
      mediaInputs: assets2.map((asset, index) => ({ role: roles[index] ?? "reference", asset }))
    };
  }
  if (!isRecord4(value) || !isRecord4(value.input) || !isRecord4(value.settings) || !Array.isArray(value.assets) || !Array.isArray(value.mediaInputs)) {
    throw new Error("The media adapter returned a malformed provider request; no provider call was made.");
  }
  const assets = value.assets.filter(isResolvedMediaAsset);
  const mediaInputs = value.mediaInputs.filter(isMappedMediaInput);
  if (assets.length !== value.assets.length || mediaInputs.length !== value.mediaInputs.length) {
    throw new Error("The media adapter returned malformed media inputs; no provider call was made.");
  }
  const settings = {};
  for (const [name, setting] of Object.entries(value.settings)) {
    if (typeof setting !== "string" && typeof setting !== "number" && typeof setting !== "boolean") {
      throw new Error("The media adapter returned malformed settings; no provider call was made.");
    }
    settings[name] = setting;
  }
  return { input: value.input, settings, providerOptions: normalizedProviderOptions(value.providerOptions), assets, mediaInputs };
}
function normalizedProviderOptions(value) {
  if (value === undefined)
    return {};
  if (!isRecord4(value))
    throw new Error("The media adapter returned malformed provider options; no provider call was made.");
  const options = {};
  for (const [providerKey, fields] of Object.entries(value)) {
    if (!isRecord4(fields))
      throw new Error("The media adapter returned malformed provider options; no provider call was made.");
    const normalized = {};
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
function assetRoles(input) {
  const fields = [
    ["input_asset", "source"],
    ["mask_asset", "mask"],
    ["start_frame_asset", "start_frame"],
    ["end_frame_asset", "end_frame"],
    ["reference_asset", "reference"]
  ];
  return fields.filter(([field]) => typeof input[field] === "string").map(([, role]) => role);
}
function scalarSettings(input) {
  const ignored = new Set(["prompt", "model", "output_dir", "input_asset", "mask_asset", "start_frame_asset", "end_frame_asset", "reference_asset"]);
  const settings = {};
  for (const [name, value] of Object.entries(input)) {
    if (!ignored.has(name) && (typeof value === "string" || typeof value === "number" || typeof value === "boolean"))
      settings[name] = value;
  }
  return settings;
}
function mappedMediaInput(call, role) {
  return call.mediaInputs.find((candidate) => candidate.role === role)?.asset;
}
function correctionError(result) {
  return new Error(result.ok ? "Unexpected successful image preflight result." : `${result.error.message} No provider call was made.`);
}
async function resolveImageAssets(store, input) {
  const refs = [input.input_asset, input.mask_asset, input.reference_asset].filter((value) => value !== undefined);
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
      value: await Promise.all(parsed.map((ref) => store.read(ref, { maxBytes: IMAGE_ASSET_MAX_BYTES })))
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "asset_invalid",
        message: error instanceof Error ? error.message : "The image asset could not be read."
      }
    };
  }
}
function readImageInput(input) {
  if (!isRecord4(input))
    return {};
  return {
    ...typeof input.model === "string" ? { model: input.model } : {},
    ...typeof input.input_asset === "string" ? { input_asset: input.input_asset } : {},
    ...typeof input.mask_asset === "string" ? { mask_asset: input.mask_asset } : {},
    ...typeof input.reference_asset === "string" ? { reference_asset: input.reference_asset } : {},
    ...typeof input.aspect_ratio === "string" ? { aspect_ratio: input.aspect_ratio } : {},
    ...typeof input.size === "string" ? { size: input.size } : {},
    ...typeof input.count === "number" ? { count: input.count } : {},
    ...typeof input.seed === "number" ? { seed: input.seed } : {},
    ...typeof input.safety === "string" ? { safety: input.safety } : {}
  };
}
function isResolvedMediaAsset(value) {
  return isRecord4(value) && value.body instanceof Uint8Array && (value.kind === "image" || value.kind === "video" || value.kind === "audio") && typeof value.contentType === "string" && typeof value.bytes === "number" && isRecord4(value.ref);
}
function isMappedMediaInput(value) {
  return isRecord4(value) && ["source", "mask", "reference", "start_frame", "end_frame"].includes(String(value.role)) && isResolvedMediaAsset(value.asset);
}
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/media-lineage.ts
var ZO_MEDIA_LINEAGE_HEADER = "x-zo-media-lineage";
var MAX_MEDIA_LINEAGE_HEADER_LENGTH = 1024;
function serializeMediaInvocationLineage(lineage) {
  const value = JSON.stringify(lineage);
  if (value.length > MAX_MEDIA_LINEAGE_HEADER_LENGTH) {
    throw new Error("media invocation lineage exceeds the internal header limit");
  }
  return value;
}
function mediaInvocationHeaders(lineage) {
  return { [ZO_MEDIA_LINEAGE_HEADER]: serializeMediaInvocationLineage(lineage) };
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/tool-meta.ts
var CLOUD_TOOL_META = {
  image: {
    description: "Generate images from text and optional durable references. Use media_models to inspect model-specific settings and prices."
  },
  "edit-image": {
    description: "Edit a durable image asset with optional mask and reference assets. Use media_models before selecting advanced settings."
  },
  video: {
    description: "Generate a video from text, frames, or a durable image reference. Use media_models to inspect capabilities and prices."
  },
  "edit-video": {
    description: "Edit a durable video asset through a verified model adapter."
  },
  "generate-speech": {
    description: "Generate spoken audio from text and save it as a durable asset. Use media_models to inspect voices, formats, and prices."
  },
  "transcribe-audio": {
    description: "Transcribe a durable audio asset with bounded inline text and optional JSON, SRT, or VTT spill output."
  },
  "media-models": {
    description: "List current media models or inspect one model's operations, settings, availability, provenance, and pricing."
  },
  "web-search": {
    description: "Search the web through a chosen provider (Exa, Parallel, or Perplexity) with domain and freshness filters. Use search_providers to compare providers."
  },
  "search-providers": {
    description: "List the available web search providers, their strengths, and supported options."
  },
  "x-search": {
    description: "Search X (Twitter) posts with handle and date filters, including image and video understanding."
  },
  "maps-search": {
    description: "Answer places and geography questions with Google Maps data: businesses, addresses, hours, and areas."
  }
};

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/tool-shared.ts
import { z as z4 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/state-consent.ts
import { z as z3 } from "zod";
var REQUEST_STATE_CONSENT_TOOL_NAME = "request_state_consent";
var consentPartySchema = z3.object({
  handle: z3.string().min(1),
  external: z3.boolean(),
  intentDivergenceNote: z3.string().min(1).optional()
});
var consentEnvelopeSchema = z3.object({
  bindingId: z3.string().min(1),
  declarationName: z3.string().min(1),
  resourceName: z3.string().min(1),
  party: consentPartySchema
});
function parseConsentEnvelope(value) {
  const result = consentEnvelopeSchema.safeParse(value);
  return result.success ? result.data : null;
}
function buildConsentSteer(envelope) {
  return [
    `Using "${envelope.resourceName}" needs the user's consent first.`,
    `Call the \`${REQUEST_STATE_CONSENT_TOOL_NAME}\` tool with exactly these values (do not change or invent them):`,
    JSON.stringify(envelope),
    `The user will be asked to Allow or Deny. On Allow, the capability is granted — retry your original operation. On Deny, do not retry; tell the user you can't proceed without access.`
  ].join(`
`);
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/state-files.ts
var DEFAULT_STATE_ASSET_DECLARATION_NAME = "files";
var STATE_FILES_HANDLE_PATH = "/state/handles";
var STATE_ASSET_INTEGRITY_PATH = "/state/assets/integrity";
var ZO_AGENT_TOKEN_HEADER = "x-zo-agent-token";
var ZO_EVE_SESSION_HEADER = "x-zo-eve-session";
var ZO_SESSION_CAPABILITY_HEADER = "x-zo-session-capability";
var DEFAULT_BROKER_REQUEST_TIMEOUT_MS = 15000;
var DEFAULT_STATE_FILES_SUGGESTED_DEFAULTS = Object.freeze({
  engine: "zo-blob-r2",
  partition: "session"
});
var DURABLE_STORAGE_FALLBACK = Object.freeze({
  "user-files": "shared-files"
});
function isBrokerFallbackDeclaration(requested, actual) {
  return DURABLE_STORAGE_FALLBACK[requested] === actual;
}

class StateFilesRuntimeError extends Error {
  constructor(message) {
    super(message);
    this.name = "StateFilesRuntimeError";
  }
}

class StateFilesConsentError extends Error {
  envelope;
  constructor(envelope) {
    super(buildConsentSteer(envelope));
    this.name = "StateFilesConsentError";
    this.envelope = envelope;
  }
}
function createRuntimeStateFilesClient(options = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const getSessionId = options.getSessionId ?? ambientControlPlaneSessionId;
  const getSessionCapability = options.getSessionCapability ?? ambientSessionCapability;
  const now = options.now ?? (() => new Date);
  const brokerRequestTimeoutMs = resolveBrokerRequestTimeoutMs(options.brokerRequestTimeoutMs);
  return {
    async resolveUrl(ref, expiresInSeconds) {
      if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds <= 0) {
        throw new StateFilesRuntimeError("media URL expiry must be a positive safe integer");
      }
      const trustedRef = assertRuntimeStateAssetRef(ref, declarationName);
      const eveSessionKey = getSessionId();
      const sessionCapability = getSessionCapability();
      const handle = await requestRuntimeStateFilesHandle({
        access: "r",
        apiBaseUrl: resolveApiBaseUrl(options.apiBaseUrl),
        agentToken: resolveAgentToken(options.agentToken),
        declarationName: trustedRef.declarationName,
        fetch: fetchImpl,
        timeoutMs: brokerRequestTimeoutMs,
        now,
        suggestedDefaults: options.suggestedDefaults ?? DEFAULT_STATE_FILES_SUGGESTED_DEFAULTS,
        ...eveSessionKey === undefined ? {} : { eveSessionKey },
        ...sessionCapability === undefined ? {} : { sessionCapability }
      });
      return presignedStateFileGetUrl({
        bucketName: handle.bucketName,
        credentials: handle.credentials,
        endpoint: handle.endpoint,
        expiresInSeconds,
        key: trustedRef.path,
        now: now()
      });
    },
    async read(ref, limits) {
      if (!Number.isSafeInteger(limits.maxBytes) || limits.maxBytes <= 0) {
        throw new StateFilesRuntimeError("media read maxBytes must be a positive safe integer");
      }
      const trustedRef = assertRuntimeStateAssetRef(ref, declarationName);
      const eveSessionKey = getSessionId();
      const sessionCapability = getSessionCapability();
      const handle = await requestRuntimeStateFilesHandle({
        access: "r",
        apiBaseUrl: resolveApiBaseUrl(options.apiBaseUrl),
        agentToken: resolveAgentToken(options.agentToken),
        declarationName: trustedRef.declarationName,
        fetch: fetchImpl,
        timeoutMs: brokerRequestTimeoutMs,
        now,
        suggestedDefaults: options.suggestedDefaults ?? DEFAULT_STATE_FILES_SUGGESTED_DEFAULTS,
        ...eveSessionKey === undefined ? {} : { eveSessionKey },
        ...sessionCapability === undefined ? {} : { sessionCapability }
      });
      const body = await getStateFileObject({
        bucketName: handle.bucketName,
        credentials: handle.credentials,
        endpoint: handle.endpoint,
        fetch: fetchImpl,
        key: trustedRef.path,
        maxBytes: limits.maxBytes,
        now
      });
      const resolved = sniffMediaAsset(trustedRef, body);
      if (resolved === null) {
        throw new StateFilesRuntimeError("the state asset is not a supported image, video, or audio file");
      }
      return resolved;
    },
    async write(path, body, writeOptions) {
      const key = normalizeStateFilePath(path);
      const eveSessionKey = getSessionId();
      const sessionCapability = getSessionCapability();
      if (eveSessionKey === undefined || eveSessionKey.trim().length === 0) {
        throw new StateFilesRuntimeError("the state asset write has no eve session, so its browser integrity proof cannot be minted");
      }
      const apiBaseUrl = resolveApiBaseUrl(options.apiBaseUrl);
      const agentToken = resolveAgentToken(options.agentToken);
      const handle = await requestRuntimeStateFilesHandle({
        access: "rw",
        apiBaseUrl,
        agentToken,
        declarationName,
        fetch: fetchImpl,
        timeoutMs: brokerRequestTimeoutMs,
        now,
        suggestedDefaults: options.suggestedDefaults ?? DEFAULT_STATE_FILES_SUGGESTED_DEFAULTS,
        eveSessionKey,
        ...sessionCapability === undefined ? {} : { sessionCapability }
      });
      if (handle.access !== "rw") {
        throw new StateFilesRuntimeError(`the "${handle.declarationName}" state files handle is read-only, so nothing can be written — the agent's state configuration must allow writes`);
      }
      const effectiveDeclarationName = handle.declarationName;
      const integrity = await requestStateAssetIntegrity({
        apiBaseUrl,
        agentToken,
        declarationName: effectiveDeclarationName,
        eveSessionKey,
        ...sessionCapability === undefined ? {} : { sessionCapability },
        fetch: fetchImpl,
        path: key,
        timeoutMs: brokerRequestTimeoutMs
      });
      await putStateFileObject({
        body,
        bucketName: handle.bucketName,
        credentials: handle.credentials,
        endpoint: handle.endpoint,
        fetch: fetchImpl,
        key,
        now,
        ...writeOptions?.contentType === undefined ? {} : { contentType: writeOptions.contentType }
      });
      return stateAssetReference({
        type: "state_asset",
        declarationName: effectiveDeclarationName,
        path: key,
        integrity,
        ...writeOptions?.contentType === undefined ? {} : { contentType: writeOptions.contentType },
        bytes: body.byteLength
      });
    }
  };
}
function assertRuntimeStateAssetRef(ref, configuredDeclarationName) {
  try {
    return assertMediaAssetRef(ref, configuredDeclarationName);
  } catch (error) {
    if (isBrokerFallbackDeclaration(configuredDeclarationName, ref.declarationName)) {
      return assertMediaAssetRef(ref, ref.declarationName);
    }
    throw error;
  }
}
function stateAssetReference(input) {
  if (input.integrity.trim().length === 0) {
    throw new StateFilesRuntimeError("state asset integrity proof must not be empty");
  }
  return Object.freeze({
    type: "state_asset",
    declarationName: input.declarationName,
    path: normalizeStateFilePath(input.path),
    integrity: input.integrity,
    ...input.contentType === undefined ? {} : { contentType: input.contentType },
    ...input.bytes === undefined ? {} : { bytes: input.bytes }
  });
}
async function requestStateAssetIntegrity(options) {
  const { response, body } = await fetchBrokerJson(options.fetch, buildApiUrl(options.apiBaseUrl, STATE_ASSET_INTEGRITY_PATH), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [ZO_AGENT_TOKEN_HEADER]: options.agentToken,
      [ZO_EVE_SESSION_HEADER]: options.eveSessionKey,
      ...options.sessionCapability === undefined ? {} : { [ZO_SESSION_CAPABILITY_HEADER]: options.sessionCapability }
    },
    body: JSON.stringify({
      declarationName: options.declarationName,
      path: options.path
    })
  }, options.timeoutMs);
  if (!response.ok) {
    throw new StateFilesRuntimeError(readBrokerErrorMessage(body));
  }
  if (!isRecord5(body) || typeof body.integrity !== "string" || body.integrity.length === 0) {
    throw new StateFilesRuntimeError("the state asset broker returned a malformed integrity proof; retrying may help");
  }
  return body.integrity;
}
function normalizeStateFilePath(path) {
  try {
    return normalizeMediaAssetPath(path);
  } catch (error) {
    throw new Error(`state file path is invalid: ${error instanceof Error ? error.message : "invalid path"}`);
  }
}
async function requestRuntimeStateFilesHandle(options) {
  const headers = new Headers({ "content-type": "application/json" });
  headers.set(ZO_AGENT_TOKEN_HEADER, options.agentToken);
  if (options.eveSessionKey !== undefined && options.eveSessionKey.trim().length > 0) {
    headers.set(ZO_EVE_SESSION_HEADER, options.eveSessionKey.trim());
  }
  if (options.sessionCapability !== undefined && options.sessionCapability.trim().length > 0) {
    headers.set(ZO_SESSION_CAPABILITY_HEADER, options.sessionCapability.trim());
  }
  const { response, body: json } = await fetchBrokerJson(options.fetch, buildStateFilesHandleUrl(options.apiBaseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({
      declarationName: options.declarationName,
      interface: "files",
      access: options.access,
      suggestedDefaults: options.suggestedDefaults
    })
  }, options.timeoutMs);
  if (!response.ok) {
    if (isConsentRequired(json)) {
      const envelope = parseConsentEnvelope(json);
      if (envelope !== null)
        throw new StateFilesConsentError(envelope);
    }
    throw new StateFilesRuntimeError(readBrokerErrorMessage(json));
  }
  const handle = parseStateFilesHandle(json);
  if (handle === null) {
    throw new StateFilesRuntimeError("the state files broker returned a malformed handle; retrying may help");
  }
  const sharedFallback = isBrokerFallbackDeclaration(options.declarationName, handle.declarationName);
  if (handle.declarationName !== options.declarationName && !sharedFallback) {
    throw new StateFilesRuntimeError("the state files broker returned a handle for another declaration");
  }
  if (options.access === "rw" && handle.access !== "rw") {
    throw new StateFilesRuntimeError("the state files broker returned a read-only handle for a write request");
  }
  if (Date.parse(handle.credentials.expiresAt) <= options.now().getTime()) {
    throw new StateFilesRuntimeError("the state files broker returned an expired handle; retrying may help");
  }
  return handle;
}
function resolveApiBaseUrl(apiBaseUrl) {
  const value = String(apiBaseUrl ?? process.env.ZO_API_URL ?? "").trim();
  if (value.length === 0) {
    throw new StateFilesRuntimeError("the agent deployment is missing ZO_API_URL, so state assets can't be saved — a configuration problem for the user to fix, not something a retry helps");
  }
  return value;
}
function resolveAgentToken(agentToken) {
  const value = (agentToken ?? process.env.ZO_AGENT_TOKEN ?? "").trim();
  if (value.length === 0) {
    throw new StateFilesRuntimeError("the agent deployment is missing ZO_AGENT_TOKEN, so state assets can't be saved — a configuration problem for the user to fix, not something a retry helps");
  }
  return value;
}
function resolveBrokerRequestTimeoutMs(value) {
  const timeoutMs = value ?? DEFAULT_BROKER_REQUEST_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new StateFilesRuntimeError("state files broker timeout must be a positive safe integer");
  }
  return timeoutMs;
}
async function fetchBrokerJson(fetchImpl, input, init, timeoutMs) {
  const controller = new AbortController;
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new StateFilesRuntimeError("the state files broker timed out; retrying may help"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl(input, {
          ...init,
          signal: controller.signal
        });
        const body = await response.json().catch(() => null);
        return { response, body };
      })(),
      timeout
    ]);
  } catch (error) {
    if (error instanceof StateFilesRuntimeError)
      throw error;
    throw new StateFilesRuntimeError(`the state files broker request failed: ${error instanceof Error ? error.message : "unknown error"}`);
  } finally {
    if (timer !== undefined)
      clearTimeout(timer);
  }
}
function buildStateFilesHandleUrl(apiBaseUrl) {
  return buildApiUrl(apiBaseUrl, STATE_FILES_HANDLE_PATH);
}
function buildApiUrl(apiBaseUrl, path) {
  const url = new URL(apiBaseUrl);
  url.pathname = `${url.pathname.replace(/\/+$/u, "")}/${path.replace(/^\/+/, "")}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}
function parseStateFilesHandle(value) {
  if (!isRecord5(value))
    return null;
  if (value.interface !== "files" || value.engine !== "zo-blob-r2")
    return null;
  const access = value.access === "r" || value.access === "rw" ? value.access : null;
  const handleId = readString(value, "handleId");
  const declarationName = readString(value, "declarationName");
  const bucketName = readString(value, "bucketName");
  const endpoint = readString(value, "endpoint");
  const credentials = parseStateFilesCredentials(value.credentials);
  if (access === null || handleId === null || declarationName === null || bucketName === null || endpoint === null || credentials === null) {
    return null;
  }
  return { handleId, declarationName, interface: "files", access, engine: "zo-blob-r2", bucketName, endpoint, credentials };
}
function parseStateFilesCredentials(value) {
  if (!isRecord5(value))
    return null;
  const accessKeyId = readString(value, "accessKeyId");
  const secretAccessKey = readString(value, "secretAccessKey");
  const sessionToken = readString(value, "sessionToken");
  const expiresAt = readString(value, "expiresAt");
  if (accessKeyId === null || secretAccessKey === null || sessionToken === null || expiresAt === null || !Number.isFinite(Date.parse(expiresAt))) {
    return null;
  }
  return { accessKeyId, secretAccessKey, sessionToken, expiresAt };
}
function isConsentRequired(value) {
  return isRecord5(value) && value.error === "consent_required";
}
function readBrokerErrorMessage(value) {
  if (!isRecord5(value))
    return "state files broker request failed";
  const code = readString(value, "error");
  const message = readString(value, "message");
  if (code !== null && message !== null)
    return `${code}: ${message}`;
  if (code !== null)
    return `state files broker request failed (${code})`;
  const nested = isRecord5(value.error) ? value.error : value;
  return readString(nested, "message") ?? "state files broker request failed";
}
async function getStateFileObject(options) {
  const url = stateFileObjectUrl(options.endpoint, options.bucketName, options.key);
  const headers = await signedS3Headers({
    credentials: options.credentials,
    date: options.now(),
    host: url.host,
    method: "GET",
    path: url.pathname,
    payloadHash: "UNSIGNED-PAYLOAD"
  });
  const response = await options.fetch(url, { method: "GET", headers });
  if (!response.ok)
    throw new StateFilesRuntimeError(`the storage read was rejected with HTTP ${response.status}`);
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > options.maxBytes) {
    await response.body?.cancel();
    throw new StateFilesRuntimeError(`the state asset exceeds the ${options.maxBytes} byte read limit`);
  }
  if (response.body === null)
    return new Uint8Array;
  const stream = response.body;
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  let done = false;
  try {
    while (!done) {
      const result = await reader.read();
      if (result.done) {
        done = true;
        continue;
      }
      total += result.value.byteLength;
      if (total > options.maxBytes) {
        await reader.cancel();
        throw new StateFilesRuntimeError(`the state asset exceeds the ${options.maxBytes} byte read limit`);
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
async function putStateFileObject(options) {
  const url = stateFileObjectUrl(options.endpoint, options.bucketName, options.key);
  const payloadHash = await sha256Hex(options.body);
  const headers = await signedS3Headers({
    credentials: options.credentials,
    date: options.now(),
    host: url.host,
    method: "PUT",
    path: url.pathname,
    payloadHash,
    ...options.contentType === undefined ? {} : { contentType: options.contentType }
  });
  const response = await options.fetch(url, {
    method: "PUT",
    headers,
    body: options.body
  });
  if (!response.ok) {
    throw new StateFilesRuntimeError(`the storage write was rejected with HTTP ${response.status}`);
  }
}
function stateFileObjectUrl(endpoint, bucketName, key) {
  const base = endpoint.replace(/\/+$/u, "");
  return new URL(`${base}/${encodeS3PathSegment(bucketName)}/${encodeS3Key(key)}`);
}
async function presignedStateFileGetUrl(options) {
  const credentialSeconds = Math.floor((Date.parse(options.credentials.expiresAt) - options.now.getTime()) / 1000);
  const expires = Math.min(options.expiresInSeconds, credentialSeconds);
  if (expires <= 0) {
    throw new StateFilesRuntimeError("the state files handle expired before a delivery URL could be created");
  }
  const url = stateFileObjectUrl(options.endpoint, options.bucketName, options.key);
  const amzDate = awsAmzDate(options.now);
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${options.credentials.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-Security-Token": options.credentials.sessionToken,
    "X-Amz-SignedHeaders": "host"
  });
  const canonicalQuery = [...query.entries()].map(([name, value]) => `${encodeS3PathSegment(name)}=${encodeS3PathSegment(value)}`).sort().join("&");
  const canonicalRequest = [
    "GET",
    url.pathname,
    canonicalQuery,
    `host:${url.host}
`,
    "host",
    "UNSIGNED-PAYLOAD"
  ].join(`
`);
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest))
  ].join(`
`);
  const signingKey = await awsSigningKey(options.credentials.secretAccessKey, dateStamp);
  query.set("X-Amz-Signature", await hmacHex(signingKey, stringToSign));
  url.search = [...query.entries()].map(([name, value]) => `${encodeS3PathSegment(name)}=${encodeS3PathSegment(value)}`).sort().join("&");
  return url;
}
async function signedS3Headers(input) {
  const amzDate = awsAmzDate(input.date);
  const dateStamp = amzDate.slice(0, 8);
  const headerEntries = [
    ["host", input.host],
    ["x-amz-content-sha256", input.payloadHash],
    ["x-amz-date", amzDate],
    ["x-amz-security-token", input.credentials.sessionToken]
  ];
  if (input.contentType !== undefined) {
    headerEntries.push(["content-type", input.contentType]);
  }
  headerEntries.sort(([left], [right]) => left.localeCompare(right));
  const canonicalHeaders = headerEntries.map(([name, value]) => `${name}:${value.trim()}
`).join("");
  const signedHeaders = headerEntries.map(([name]) => name).join(";");
  const canonicalRequest = [
    input.method,
    input.path,
    "",
    canonicalHeaders,
    signedHeaders,
    input.payloadHash
  ].join(`
`);
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest))
  ].join(`
`);
  const signingKey = await awsSigningKey(input.credentials.secretAccessKey, dateStamp);
  const signature = await hmacHex(signingKey, stringToSign);
  const headers = new Headers;
  for (const [name, value] of headerEntries)
    headers.set(name, value);
  headers.set("authorization", `AWS4-HMAC-SHA256 Credential=${input.credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`);
  return headers;
}
async function awsSigningKey(secretAccessKey, dateStamp) {
  const dateKey = await hmacBytes(new TextEncoder().encode(`AWS4${secretAccessKey}`), dateStamp);
  const regionKey = await hmacBytes(dateKey, "auto");
  const serviceKey = await hmacBytes(regionKey, "s3");
  return hmacBytes(serviceKey, "aws4_request");
}
async function hmacBytes(key, data) {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data)));
}
async function hmacHex(key, data) {
  return bytesToHex(await hmacBytes(key, data));
}
async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}
function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function awsAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/gu, "");
}
function encodeS3Key(key) {
  return key.split("/").map(encodeS3PathSegment).join("/");
}
function encodeS3PathSegment(segment) {
  return encodeURIComponent(segment).replace(/[!'()*]/gu, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
function isRecord5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/tool-shared.ts
var StateAssetReferenceSchema = z4.object({
  bytes: z4.number().int().nonnegative().optional(),
  contentType: z4.string().optional(),
  declarationName: z4.string(),
  integrity: z4.string().min(1),
  path: z4.string(),
  type: z4.literal("state_asset")
});
var GeneratedAssetOutputSchema = z4.object({
  asset: StateAssetReferenceSchema,
  bytes: z4.number().int().nonnegative(),
  mediaType: z4.string(),
  model: z4.string(),
  path: z4.string(),
  prompt: z4.string(),
  warnings: z4.array(z4.string())
});
function warningText(warning) {
  return errorDetail(warning);
}
var ERROR_DETAIL_MAX_CHARS = 2000;
function errorDetail(error) {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error) ?? String(error);
  if (raw.length <= ERROR_DETAIL_MAX_CHARS)
    return raw;
  return `${raw.slice(0, ERROR_DETAIL_MAX_CHARS)} … [truncated]`;
}
function generationFailure(kind, error) {
  return new Error(`No ${kind} was generated — the generation call failed: ${errorDetail(error)}. ` + `If this looks transient (rate limit, timeout, server error), retry the call; ` + `if it names the model, fix the \`model\` input or omit it to use the default. ` + `If it keeps failing, report the reason to the user instead of retrying further.`);
}
function saveFailure(kind, error) {
  if (error instanceof StateFilesConsentError)
    return error;
  return new Error(`The ${kind} was generated but no state asset was saved — ${errorDetail(error)}. ` + `Nothing is available to the chat. If the reason looks transient (a storage ` + `write failure), retry the call once; if it's a configuration problem, report ` + `it to the user instead of retrying.`);
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/image.ts
var DEFAULT_IMAGE_MODEL = "bfl/flux-2-pro";
var SizeSchema = z5.templateLiteral([z5.number().int(), "x", z5.number().int()]).refine((value) => /^[1-9]\d*x[1-9]\d*$/u.test(value), "size dimensions must be positive integers");
var AspectRatioSchema = z5.templateLiteral([z5.number().int(), ":", z5.number().int()]).refine((value) => /^[1-9]\d*:[1-9]\d*$/u.test(value), "aspect ratio terms must be positive integers");
var GenerateImageInputSchema = z5.object({
  prompt: z5.string().trim().min(1).max(4000),
  model: z5.string().trim().min(1).optional(),
  reference_asset: z5.string().trim().startsWith("files:").optional(),
  size: SizeSchema.optional(),
  aspect_ratio: AspectRatioSchema.optional(),
  count: z5.number().int().min(1).max(4).optional(),
  seed: z5.number().int().nonnegative().optional(),
  safety: z5.enum(["strict", "standard", "relaxed"]).optional().describe("Content moderation strictness, when the model supports it."),
  output_dir: OutputDirSchema.optional()
});
var GenerateImageOutputSchema = z5.object({
  assets: z5.array(StateAssetReferenceSchema).min(1),
  model: z5.string(),
  prompt: z5.string(),
  warnings: z5.array(z5.string())
});
function generateImageTool(options = {}) {
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const assetStore = options.assetStore ?? createRuntimeStateFilesClient({ declarationName });
  const preflight = options.preflight ?? createImagePreflight({ operation: "image.generate", assetStore, defaultModel: DEFAULT_IMAGE_MODEL, ...options.registry === undefined ? {} : { registry: options.registry } });
  const generate = options.generate ?? generateImage;
  const randomId = options.randomId ?? (() => randomUUID().slice(0, 8));
  return defineTool2({
    description: CLOUD_TOOL_META.image.description,
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
    async execute(input) {
      if (input.size !== undefined && input.aspect_ratio !== undefined) {
        throw new Error("Give size or aspect_ratio, not both. No provider call was made.");
      }
      const checked = await preflight.run({ operation: "image.generate", input, catalogPolicy: input.model === undefined ? "allow_stale" : "fresh" });
      if (!checked.ok)
        throw correctionError(checked);
      const mapped = normalizedMappedCall(checked.value.mappedCall, input);
      const reference = mappedMediaInput(mapped, "reference");
      const prompt = readMappedString(mapped.input, "prompt");
      const count = readMappedNumber(mapped.settings, "count") ?? 1;
      const size = readOptionalMappedString(mapped.settings, "size");
      const aspectRatio = readOptionalMappedString(mapped.settings, "aspect_ratio");
      const seed = readMappedNumber(mapped.settings, "seed");
      if (size !== undefined && !isSize(size))
        throw new Error("The media adapter returned invalid size; no provider request was made.");
      if (aspectRatio !== undefined && !isAspectRatio(aspectRatio))
        throw new Error("The media adapter returned invalid aspect_ratio; no provider request was made.");
      let result;
      try {
        result = await generate({
          model: zoGateway().imageModel(checked.value.lineage.concreteModelId),
          prompt: reference === undefined ? prompt : { text: prompt, images: [reference.body] },
          n: count,
          ...size === undefined ? {} : { size },
          ...aspectRatio === undefined ? {} : { aspectRatio },
          ...seed === undefined ? {} : { seed },
          ...Object.keys(mapped.providerOptions).length === 0 ? {} : { providerOptions: mapped.providerOptions },
          headers: {
            [ZO_TOOL_HEADER]: "generate_image",
            ...mediaInvocationHeaders(checked.value.lineage)
          }
        });
      } catch (error) {
        throw generationFailure("image", error);
      }
      const generated = result.images?.length ? result.images : [result.image];
      const assets = [];
      for (const image2 of generated) {
        const path = assetOutputPath({ id: randomId(), mediaType: image2.mediaType, outputDir: input.output_dir, prompt: input.prompt, fallbackSlug: "image" });
        try {
          assets.push(await assetStore.write(path, image2.uint8Array, { contentType: image2.mediaType }));
        } catch (error) {
          throw saveFailure("image", error);
        }
      }
      return { assets, model: checked.value.lineage.concreteModelId, prompt: input.prompt, warnings: result.warnings.map(warningText) };
    },
    toModelOutput(output) {
      return {
        type: "text",
        value: `Generated ${output.assets.length} image asset(s): ${output.assets.map((asset) => formatMediaAssetRef({
          type: "state_asset",
          declarationName: asset.declarationName,
          path: asset.path,
          ...asset.contentType === undefined ? {} : { contentType: asset.contentType },
          ...asset.bytes === undefined ? {} : { bytes: asset.bytes }
        }, declarationName)).join(", ")}.`
      };
    }
  });
}
function readMappedString(record, name) {
  const value = record[name];
  if (typeof value !== "string")
    throw new Error(`The media adapter omitted ${name}; no provider call was made.`);
  return value;
}
function readOptionalMappedString(record, name) {
  const value = record[name];
  if (value === undefined)
    return;
  if (typeof value !== "string")
    throw new Error(`The media adapter returned invalid ${name}; no provider call was made.`);
  return value;
}
function readMappedNumber(record, name) {
  const value = record[name];
  if (value === undefined)
    return;
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`The media adapter returned invalid ${name}; no provider call was made.`);
  return value;
}
var image_default = generateImageTool();
function isSize(value) {
  return /^[1-9]\d*x[1-9]\d*$/u.test(value);
}
function isAspectRatio(value) {
  return /^[1-9]\d*:[1-9]\d*$/u.test(value);
}
// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/edit-image.ts
import { randomUUID as randomUUID2 } from "node:crypto";
import { generateImage as generateImage2 } from "ai";
import { defineTool as defineTool3 } from "eve/tools";
import { z as z6 } from "zod";
var DEFAULT_IMAGE_EDIT_MODEL = "bfl/flux-kontext-pro";
var AspectRatioSchema2 = z6.templateLiteral([z6.number().int().positive(), ":", z6.number().int().positive()]);
var EditImageInputSchema = z6.object({
  input_asset: z6.string().trim().startsWith("files:"),
  prompt: z6.string().trim().min(1).max(4000),
  model: z6.string().trim().min(1).optional(),
  mask_asset: z6.string().trim().startsWith("files:").optional(),
  reference_asset: z6.string().trim().startsWith("files:").optional(),
  aspect_ratio: AspectRatioSchema2.optional(),
  safety: z6.enum(["strict", "standard", "relaxed"]).optional().describe("Content moderation strictness, when the model supports it."),
  output_dir: OutputDirSchema.optional()
});
var EditImageOutputSchema = z6.object({ asset: StateAssetReferenceSchema, model: z6.string(), prompt: z6.string(), warnings: z6.array(z6.string()) });
function editImageTool(options = {}) {
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const assetStore = options.assetStore ?? createRuntimeStateFilesClient({ declarationName });
  const preflight = options.preflight ?? createImagePreflight({ operation: "image.edit", assetStore, defaultModel: DEFAULT_IMAGE_EDIT_MODEL, ...options.registry === undefined ? {} : { registry: options.registry } });
  const generate = options.generate ?? generateImage2;
  const randomId = options.randomId ?? (() => randomUUID2().slice(0, 8));
  return defineTool3({
    description: "Edit a durable image asset with a capability-verified image model and save the result as a new asset.",
    inputSchema: EditImageInputSchema,
    outputSchema: EditImageOutputSchema,
    async execute(input) {
      const checked = await preflight.run({ operation: "image.edit", input, catalogPolicy: input.model === undefined ? "allow_stale" : "fresh" });
      if (!checked.ok)
        throw correctionError(checked);
      const mapped = normalizedMappedCall(checked.value.mappedCall, input);
      const source = mappedMediaInput(mapped, "source");
      if (source === undefined)
        throw new Error("Editing requires input_asset. No provider call was made.");
      const mask = mappedMediaInput(mapped, "mask");
      const reference = mappedMediaInput(mapped, "reference");
      const prompt = mapped.input.prompt;
      if (typeof prompt !== "string")
        throw new Error("The media adapter omitted prompt; no provider call was made.");
      const aspectRatio = mapped.settings.aspect_ratio;
      if (aspectRatio !== undefined && typeof aspectRatio !== "string")
        throw new Error("The media adapter returned invalid aspect_ratio; no provider call was made.");
      if (aspectRatio !== undefined && !isAspectRatio2(aspectRatio))
        throw new Error("The media adapter returned invalid aspect_ratio; no provider call was made.");
      let result;
      try {
        result = await generate({
          model: zoGateway().imageModel(checked.value.lineage.concreteModelId),
          prompt: {
            text: prompt,
            images: reference === undefined ? [source.body] : [source.body, reference.body],
            ...mask === undefined ? {} : { mask: mask.body }
          },
          ...aspectRatio === undefined ? {} : { aspectRatio },
          ...Object.keys(mapped.providerOptions).length === 0 ? {} : { providerOptions: mapped.providerOptions },
          headers: { [ZO_TOOL_HEADER]: "edit_image", ...mediaInvocationHeaders(checked.value.lineage) }
        });
      } catch (error) {
        throw generationFailure("image", error);
      }
      const path = assetOutputPath({ id: randomId(), mediaType: result.image.mediaType, outputDir: input.output_dir, prompt: input.prompt, fallbackSlug: "edited-image" });
      let asset;
      try {
        asset = await assetStore.write(path, result.image.uint8Array, { contentType: result.image.mediaType });
      } catch (error) {
        throw saveFailure("image", error);
      }
      return { asset, model: checked.value.lineage.concreteModelId, prompt: input.prompt, warnings: result.warnings.map(warningText) };
    },
    toModelOutput(output) {
      const asset = {
        type: "state_asset",
        declarationName: output.asset.declarationName,
        path: output.asset.path,
        ...output.asset.contentType === undefined ? {} : { contentType: output.asset.contentType },
        ...output.asset.bytes === undefined ? {} : { bytes: output.asset.bytes }
      };
      return { type: "text", value: `Edited image saved as ${formatMediaAssetRef(asset, declarationName)}.` };
    }
  });
}
var edit_image_default = editImageTool();
function isAspectRatio2(value) {
  return /^[1-9]\d*:[1-9]\d*$/u.test(value);
}
// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/video.ts
import { randomUUID as randomUUID3 } from "node:crypto";
import { experimental_generateVideo as generateVideo } from "ai";
import { defineTool as defineTool4 } from "eve/tools";
import { z as z7 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/video-lane.ts
var VIDEO_ASSET_MAX_BYTES = 256 * 1024 * 1024;
function createVideoPreflight(options) {
  return createMediaPreflight({
    registry: options.registry ?? defaultMediaRegistry,
    selectModel: (_operation, input) => readVideoInput(input).model ?? options.defaultModel,
    selectSettings: (_operation, input) => {
      const value = readVideoInput(input);
      return {
        ...value.aspect_ratio === undefined ? {} : { aspect_ratio: value.aspect_ratio },
        ...value.resolution === undefined ? {} : { resolution: value.resolution },
        ...value.duration_seconds === undefined ? {} : { duration_seconds: value.duration_seconds },
        ...value.fps === undefined ? {} : { fps: value.fps },
        ...value.generate_audio === undefined ? {} : { generate_audio: value.generate_audio },
        ...value.seed === undefined ? {} : { seed: value.seed }
      };
    },
    resolveAssets: async (input) => resolveVideoAssets(options.assetStore, readVideoInput(input))
  });
}
async function resolveVideoAssets(store, input) {
  const values = [input.input_asset, input.start_frame_asset, input.end_frame_asset, input.reference_asset].filter((value) => value !== undefined);
  const refs = [];
  for (const value of values) {
    const ref = parseMediaAssetRef(value);
    if (ref === null)
      return { ok: false, error: { code: "asset_invalid", message: "Media assets must use a files:path/to/file scalar." } };
    refs.push(ref);
  }
  try {
    return { ok: true, value: await Promise.all(refs.map((ref) => store.read(ref, { maxBytes: VIDEO_ASSET_MAX_BYTES }))) };
  } catch (error) {
    return { ok: false, error: { code: "asset_invalid", message: error instanceof Error ? error.message : "The video asset could not be read." } };
  }
}
function readVideoInput(input) {
  if (!isRecord6(input))
    return {};
  return {
    ...typeof input.model === "string" ? { model: input.model } : {},
    ...typeof input.input_asset === "string" ? { input_asset: input.input_asset } : {},
    ...typeof input.start_frame_asset === "string" ? { start_frame_asset: input.start_frame_asset } : {},
    ...typeof input.end_frame_asset === "string" ? { end_frame_asset: input.end_frame_asset } : {},
    ...typeof input.reference_asset === "string" ? { reference_asset: input.reference_asset } : {},
    ...typeof input.aspect_ratio === "string" ? { aspect_ratio: input.aspect_ratio } : {},
    ...typeof input.resolution === "string" ? { resolution: input.resolution } : {},
    ...typeof input.duration_seconds === "number" ? { duration_seconds: input.duration_seconds } : {},
    ...typeof input.fps === "number" ? { fps: input.fps } : {},
    ...typeof input.generate_audio === "boolean" ? { generate_audio: input.generate_audio } : {},
    ...typeof input.seed === "number" ? { seed: input.seed } : {}
  };
}
function isRecord6(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/video.ts
var DEFAULT_VIDEO_MODEL = "bytedance/seedance-2.0-fast";
var DEFAULT_VIDEO_DOWNLOAD_MAX_BYTES = 256 * 1024 * 1024;
var DEFAULT_VIDEO_TIMEOUT_MS = 8 * 60 * 1000;
var AspectRatioSchema3 = z7.enum(["16:9", "9:16", "1:1"]);
var ResolutionSchema = z7.enum(["480x854", "854x480", "720x1280", "1280x720", "1080x1920", "1920x1080"]);
var AssetScalarSchema = z7.string().trim().startsWith("files:");
var GenerateVideoInputSchema = z7.object({
  aspect_ratio: AspectRatioSchema3.optional(),
  duration_seconds: z7.number().int().positive().max(30).optional(),
  end_frame_asset: AssetScalarSchema.optional(),
  fps: z7.number().int().min(1).max(60).optional(),
  generate_audio: z7.boolean().optional(),
  model: z7.string().trim().min(1).optional(),
  output_dir: OutputDirSchema.optional(),
  prompt: z7.string().trim().min(1).max(4000),
  reference_asset: AssetScalarSchema.optional(),
  resolution: ResolutionSchema.optional(),
  seed: z7.number().int().nonnegative().optional(),
  start_frame_asset: AssetScalarSchema.optional()
});
var GenerateVideoOutputSchema = GeneratedAssetOutputSchema;
function generateVideoTool(options = {}) {
  const runtimeStore = options.assetStore ?? createRuntimeStateFilesClient();
  const assetWriter = options.assetWriter ?? runtimeStore;
  const preflight = options.preflight ?? createVideoPreflight({ assetStore: runtimeStore, defaultModel: DEFAULT_VIDEO_MODEL });
  const generate = options.generate ?? generateVideo;
  const randomId = options.randomId ?? (() => randomUUID3().slice(0, 8));
  return defineTool4({
    description: CLOUD_TOOL_META.video.description,
    inputSchema: GenerateVideoInputSchema,
    outputSchema: GenerateVideoOutputSchema,
    async execute(input) {
      const modeError = validateGenerationMode(input);
      if (modeError !== null)
        throw correctionError2(modeError);
      const checked = await runPreflight(preflight, "video.generate", input);
      const mapped = normalizedMappedCall(checked.mappedCall, input);
      const start = mappedMediaInput(mapped, "start_frame");
      const end = mappedMediaInput(mapped, "end_frame");
      const reference = mappedMediaInput(mapped, "reference");
      const promptText = mapped.input.prompt;
      if (typeof promptText !== "string")
        throw new Error("Media adapter omitted prompt; no provider request was made.");
      const prompt = start !== undefined && end === undefined ? { image: start.body, text: promptText } : promptText;
      const frameImages = start !== undefined && end !== undefined ? [{ image: start.body, frameType: "first_frame" }, { image: end.body, frameType: "last_frame" }] : undefined;
      let result;
      try {
        result = await generate({
          headers: { [ZO_TOOL_HEADER]: "generate_video", ...mediaInvocationHeaders(checked.lineage) },
          model: zoGateway().video(checked.lineage.concreteModelId),
          prompt,
          abortSignal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_VIDEO_TIMEOUT_MS),
          download: options.download ?? createBoundedVideoDownload({ timeoutMs: options.timeoutMs ?? DEFAULT_VIDEO_TIMEOUT_MS }),
          ...mappedVideoSettings(mapped.settings),
          ...Object.keys(mapped.providerOptions).length === 0 ? {} : { providerOptions: mapped.providerOptions },
          ...frameImages === undefined ? {} : { frameImages },
          ...reference === undefined ? {} : { inputReferences: [reference.body] }
        });
      } catch (error) {
        throw generationFailure("video", error);
      }
      return persistVideo({ assetWriter, input, model: checked.lineage.concreteModelId, randomId, result });
    },
    toModelOutput: videoModelOutput
  });
}
function createBoundedVideoDownload(options = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const maxBytes = options.maxBytes ?? DEFAULT_VIDEO_DOWNLOAD_MAX_BYTES;
  return async ({ url, abortSignal }) => {
    if (url.protocol !== "https:")
      throw new Error("video output download requires HTTPS");
    const response = await fetchImpl(url, {
      signal: abortSignal ?? AbortSignal.timeout(options.timeoutMs ?? DEFAULT_VIDEO_TIMEOUT_MS)
    });
    if (!response.ok)
      throw new Error(`video output download failed with HTTP ${response.status}`);
    const declaredBytes = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new Error(`video output exceeds the ${maxBytes}-byte download limit`);
    }
    const data = await readBoundedResponse(response, maxBytes);
    return { data, mediaType: response.headers.get("content-type") ?? undefined };
  };
}
function validateGenerationMode(input) {
  if (input.end_frame_asset !== undefined && input.start_frame_asset === undefined) {
    return { code: "asset_invalid", message: "end_frame_asset requires start_frame_asset." };
  }
  if (input.reference_asset !== undefined && (input.start_frame_asset !== undefined || input.end_frame_asset !== undefined)) {
    return { code: "asset_invalid", message: "reference_asset cannot be combined with start/end frame assets." };
  }
  return null;
}
async function runPreflight(preflight, operation, input) {
  if (preflight === undefined) {
    throw correctionError2({ code: "catalog_unavailable", message: "Media preflight is not configured; no provider request was made." });
  }
  const explicitModel = typeof input === "object" && input !== null && "model" in input && typeof input.model === "string";
  const result = await preflight.run({ operation, input, catalogPolicy: explicitModel ? "fresh" : "allow_stale" });
  if (!result.ok)
    throw correctionError2(result.error);
  return result.value;
}
async function readBoundedResponse(response, maxBytes) {
  if (response.body === null)
    return new Uint8Array;
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;; ) {
      const part = await reader.read();
      if (part.done)
        break;
      if (!(part.value instanceof Uint8Array))
        throw new Error("video output returned a malformed byte stream");
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
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}
function mappedVideoSettings(settings) {
  const aspectRatio = optionalString(settings, "aspect_ratio");
  const duration = optionalNumber(settings, "duration_seconds");
  const fps = optionalNumber(settings, "fps");
  const generateAudio = optionalBoolean(settings, "generate_audio");
  const resolution = optionalString(settings, "resolution");
  const seed = optionalNumber(settings, "seed");
  if (aspectRatio !== undefined && !isAspectRatio3(aspectRatio))
    throw new Error("Media adapter returned invalid aspect_ratio; no provider request was made.");
  if (resolution !== undefined && !isResolution(resolution))
    throw new Error("Media adapter returned invalid resolution; no provider request was made.");
  return { ...aspectRatio === undefined ? {} : { aspectRatio }, ...duration === undefined ? {} : { duration }, ...fps === undefined ? {} : { fps }, ...generateAudio === undefined ? {} : { generateAudio }, ...resolution === undefined ? {} : { resolution }, ...seed === undefined ? {} : { seed } };
}
function optionalString(record, name) {
  const value = record[name];
  if (value === undefined)
    return;
  if (typeof value !== "string")
    throw new Error(`Media adapter returned invalid ${name}; no provider request was made.`);
  return value;
}
function optionalNumber(record, name) {
  const value = record[name];
  if (value === undefined)
    return;
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`Media adapter returned invalid ${name}; no provider request was made.`);
  return value;
}
function optionalBoolean(record, name) {
  const value = record[name];
  if (value === undefined)
    return;
  if (typeof value !== "boolean")
    throw new Error(`Media adapter returned invalid ${name}; no provider request was made.`);
  return value;
}
function isAspectRatio3(value) {
  return /^\d+:\d+$/u.test(value);
}
function isResolution(value) {
  return /^\d+x\d+$/u.test(value);
}
async function persistVideo(options) {
  const video2 = options.result.video;
  const path = assetOutputPath({ id: options.randomId(), mediaType: video2.mediaType, outputDir: options.input.output_dir, prompt: options.input.prompt, fallbackSlug: "video" });
  let asset;
  try {
    asset = await options.assetWriter.write(path, video2.uint8Array, { contentType: video2.mediaType });
  } catch (error) {
    throw saveFailure("video", error);
  }
  return { asset, bytes: video2.uint8Array.byteLength, mediaType: video2.mediaType, model: options.model, path, prompt: options.input.prompt, warnings: options.result.warnings.map(warningText) };
}
function correctionError2(correction3) {
  return new Error(`${correction3.code}: ${correction3.message}`);
}
function videoModelOutput(output) {
  return { type: "text", value: `Generated video saved as state asset ${output.asset.declarationName}:${output.asset.path}. Pass files:${output.asset.path} to another media tool; no temporary URL is exposed.` };
}
var video_default = generateVideoTool();
// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/edit-video.ts
import { experimental_generateVideo as generateVideo2 } from "ai";
import { defineTool as defineTool5 } from "eve/tools";
import { z as z8 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/provider-media-input.ts
function createProviderMediaInputResolver(options) {
  return async function resolveProviderMediaInput(request) {
    const asset = await options.read(request.ref, { maxBytes: request.maxBytes });
    if (!request.acceptedKinds.includes(asset.kind)) {
      throw new Error(`media asset has unsupported kind "${asset.kind}"`);
    }
    if (request.delivery === "bytes") {
      return { delivery: "bytes", body: asset.body, contentType: asset.contentType };
    }
    if (options.resolveUrl === undefined) {
      throw new Error("this provider requires internal URL delivery, but no trusted URL resolver is configured");
    }
    try {
      const url = await options.resolveUrl(asset.ref, request.urlExpiresInSeconds ?? 300);
      return { delivery: "url", url, contentType: asset.contentType };
    } catch {
      throw new Error("the internal media delivery URL could not be created");
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/edit-video.ts
import { randomUUID as randomUUID4 } from "node:crypto";
var DEFAULT_VIDEO_EDIT_MODEL = "xai/grok-imagine-video";
var AssetScalarSchema2 = z8.string().trim().startsWith("files:");
var EditVideoInputSchema = z8.object({
  input_asset: AssetScalarSchema2,
  model: z8.string().trim().min(1).optional(),
  output_dir: OutputDirSchema.optional(),
  prompt: z8.string().trim().min(1).max(4000)
});
var EditVideoOutputSchema = GeneratedAssetOutputSchema;
function editVideoTool(options = {}) {
  const runtimeStore = options.assetStore ?? createRuntimeStateFilesClient();
  const writer = options.assetWriter ?? runtimeStore;
  const preflight = options.preflight ?? createVideoPreflight({ assetStore: runtimeStore, defaultModel: DEFAULT_VIDEO_EDIT_MODEL });
  const resolveProviderInput = options.resolveProviderInput ?? createProviderMediaInputResolver({
    read: runtimeStore.read.bind(runtimeStore),
    resolveUrl: async (ref, expiresInSeconds) => {
      if (runtimeStore.resolveUrl === undefined) {
        throw new Error("trusted URL delivery is unavailable");
      }
      return runtimeStore.resolveUrl(ref, expiresInSeconds);
    }
  });
  return defineTool5({
    description: "Edit a durable video asset with a supported video model. Call media_models before choosing a model.",
    inputSchema: EditVideoInputSchema,
    outputSchema: EditVideoOutputSchema,
    async execute(input) {
      const checked = await preflight.run({ operation: "video.edit", input, catalogPolicy: input.model === undefined ? "allow_stale" : "fresh" });
      if (!checked.ok)
        throw new Error(`${checked.error.code}: ${checked.error.message}`);
      const mapped = normalizedMappedCall(checked.value.mappedCall, input);
      const sourceAsset = mappedMediaInput(mapped, "source");
      if (sourceAsset === undefined)
        throw new Error("asset_invalid: adapter omitted the source video; no provider request was made.");
      const prompt = mapped.input.prompt;
      if (typeof prompt !== "string")
        throw new Error("setting_unsupported: adapter omitted prompt; no provider request was made.");
      const source = await resolveProviderInput({ ref: sourceAsset.ref, delivery: "url", maxBytes: DEFAULT_VIDEO_DOWNLOAD_MAX_BYTES, acceptedKinds: ["video"], urlExpiresInSeconds: Math.ceil((options.timeoutMs ?? DEFAULT_VIDEO_TIMEOUT_MS) / 1000) + 60 });
      if (source.delivery !== "url")
        throw new Error("asset_invalid: Video edit provider requires trusted URL delivery.");
      let result;
      try {
        result = await (options.generate ?? generateVideo2)({
          abortSignal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_VIDEO_TIMEOUT_MS),
          download: options.download ?? createBoundedVideoDownload(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
          headers: { [ZO_TOOL_HEADER]: "edit_video", ...mediaInvocationHeaders(checked.value.lineage) },
          model: zoGateway().video(checked.value.lineage.concreteModelId),
          prompt,
          providerOptions: { ...mapped.providerOptions, xai: { ...mapped.providerOptions.xai, videoUrl: source.url.toString() } }
        });
      } catch (error) {
        throw generationFailure("video", error);
      }
      const video2 = result.video;
      const path = assetOutputPath({ id: (options.randomId ?? (() => randomUUID4().slice(0, 8)))(), mediaType: video2.mediaType, outputDir: input.output_dir, prompt: input.prompt, fallbackSlug: "video-edit" });
      let asset;
      try {
        asset = await writer.write(path, video2.uint8Array, { contentType: video2.mediaType });
      } catch (error) {
        throw saveFailure("video", error);
      }
      return { asset, bytes: video2.uint8Array.byteLength, mediaType: video2.mediaType, model: checked.value.lineage.concreteModelId, path, prompt: input.prompt, warnings: result.warnings.map(warningText) };
    },
    toModelOutput(output) {
      return { type: "text", value: `Edited video saved as state asset ${output.asset.declarationName}:${output.asset.path}. Pass files:${output.asset.path} to another media tool; no temporary URL is exposed.` };
    }
  });
}
var edit_video_default = editVideoTool();
// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/generate-speech.ts
import { randomUUID as randomUUID5 } from "node:crypto";
import { generateSpeech } from "ai";
import { defineTool as defineTool6 } from "eve/tools";
import { z as z9 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/audio-lane.ts
var DEFAULT_AUDIO_READ_LIMIT_BYTES = 25 * 1024 * 1024;
var DEFAULT_INLINE_TRANSCRIPT_CHARS = 8000;
var DEFAULT_INLINE_SEGMENTS = 24;
function createAudioPreflight(options) {
  const shared = createMediaPreflight({
    registry: options.registry ?? defaultMediaRegistry,
    selectModel: (_operation, input) => readAudioInput(input).model ?? options.defaultModel,
    selectSettings: (_operation, input) => audioSettings(options.operation, readAudioInput(input)),
    resolveAssets: async (input) => resolveAudioInputs(options, readAudioInput(input))
  });
  return async (input) => {
    const catalogPolicy = readAudioInput(input).model === undefined ? "allow_stale" : "fresh";
    const checked = await shared.run({ operation: options.operation, input, catalogPolicy });
    if (!checked.ok)
      return checked;
    const estimate = options.operation === "speech.generate" ? estimateSpeechCharacterCost(readAudioInput(input).text ?? "", checked.value.profile.pricing?.speechPerCharacterUsd) : checked.value.estimate;
    return { ok: true, value: {
      model: checked.value.lineage.concreteModelId,
      request: options.mapRequest(input),
      estimate,
      lineage: { ...checked.value.lineage, estimate },
      resolvedAssets: resolvedAssetsFromMappedCall(checked.value.mappedCall)
    } };
  };
}
function audioSettings(operation, input) {
  if (operation === "speech.generate")
    return {
      ...input.voice === undefined ? {} : { voice: input.voice },
      ...input.format === undefined ? {} : { format: input.format },
      ...input.language === undefined ? {} : { language: input.language },
      ...input.speed === undefined ? {} : { speed: input.speed },
      ...input.style === undefined ? {} : { style: input.style }
    };
  return {
    ...input.timestamps === undefined ? {} : { timestamps: input.timestamps }
  };
}
async function resolveAudioInputs(options, input) {
  if (options.operation === "speech.generate")
    return { ok: true, value: [] };
  const ref = input.input_asset === undefined ? null : parseMediaAssetRef(input.input_asset);
  if (ref === null)
    return { ok: false, error: { code: "asset_invalid", message: "input_asset must be a valid files: state asset path." } };
  if (options.assetStore === undefined)
    return { ok: false, error: { code: "asset_invalid", message: "No audio asset store is configured." } };
  try {
    const asset = await resolveAudioAsset(options.assetStore, ref);
    return { ok: true, value: [asset] };
  } catch (error) {
    return { ok: false, error: { code: "asset_invalid", message: error instanceof Error ? error.message : "The audio asset could not be read." } };
  }
}
function resolvedAssetsFromMappedCall(value) {
  if (typeof value !== "object" || value === null || !("assets" in value) || !Array.isArray(value.assets))
    return [];
  return value.assets.filter(isResolvedMediaAsset2);
}
function isResolvedMediaAsset2(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  return Reflect.get(value, "body") instanceof Uint8Array && typeof Reflect.get(value, "contentType") === "string" && typeof Reflect.get(value, "bytes") === "number";
}
function readAudioInput(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return {};
  const input = value;
  return {
    ...typeof input.model === "string" ? { model: input.model } : {},
    ...typeof input.text === "string" ? { text: input.text } : {},
    ...typeof input.voice === "string" ? { voice: input.voice } : {},
    ...typeof input.format === "string" ? { format: input.format } : {},
    ...typeof input.language === "string" ? { language: input.language } : {},
    ...typeof input.speed === "number" ? { speed: input.speed } : {},
    ...typeof input.style === "string" ? { style: input.style } : {},
    ...typeof input.input_asset === "string" ? { input_asset: input.input_asset } : {},
    ...typeof input.timestamps === "string" ? { timestamps: input.timestamps } : {}
  };
}
function estimateSpeechCharacterCost(text, perCharacterUsd) {
  if (perCharacterUsd === undefined)
    return { confidence: "unknown" };
  const rate = Number(perCharacterUsd);
  if (!Number.isFinite(rate) || rate < 0)
    return { confidence: "unknown" };
  return { confidence: "exact", amountUsd: text.length * rate };
}
function correctionError3(correction3) {
  return new Error(`${correction3.message} [${correction3.code}] No provider request was made.`);
}
async function resolveAudioAsset(store, ref, maxBytes = DEFAULT_AUDIO_READ_LIMIT_BYTES) {
  const asset = await store.read(ref, { maxBytes });
  if (asset.kind !== "audio") {
    throw new Error("transcribe_audio accepts audio assets only; no provider request was made.");
  }
  return asset;
}
function audioOutputPath(options) {
  const dir = options.outputDir ?? "generated";
  const stem = options.stem.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 48) || "audio";
  return `${dir}/${stem}-${options.id}.${options.extension}`;
}
function captionTime(seconds, decimal) {
  const millis = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(millis / 3600000);
  const minutes = Math.floor(millis % 3600000 / 60000);
  const secs = Math.floor(millis % 60000 / 1000);
  const remainder = millis % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}${decimal}${String(remainder).padStart(3, "0")}`;
}
function serializeTranscript(format, text, segments) {
  const value = format === "json" ? `${JSON.stringify({ text, segments }, null, 2)}
` : format === "srt" ? segments.map((segment, index) => `${index + 1}
${captionTime(segment.startSecond, ",")} --> ${captionTime(segment.endSecond, ",")}
${segment.text}
`).join(`
`) : `WEBVTT

${segments.map((segment) => `${captionTime(segment.startSecond, ".")} --> ${captionTime(segment.endSecond, ".")}
${segment.text}
`).join(`
`)}`;
  return {
    body: new TextEncoder().encode(value),
    contentType: format === "json" ? "application/json" : format === "srt" ? "application/x-subrip" : "text/vtt",
    extension: format
  };
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/generate-speech.ts
var DEFAULT_SPEECH_MODEL = "openai/tts-1";
var GenerateSpeechInputSchema = z9.object({
  format: z9.enum(["mp3", "wav"]).optional().describe("Audio format; omit for the model default."),
  language: z9.string().trim().min(2).max(16).optional().describe("ISO language code or 'auto', when supported."),
  model: z9.string().trim().min(1).optional().describe("Speech model id; omit to use the default."),
  output_dir: OutputDirSchema.optional().describe("Relative state-file output directory."),
  speed: z9.number().min(0.25).max(4).optional().describe("Speaking speed, when supported."),
  style: z9.string().trim().min(1).max(500).optional().describe("Short delivery or expression instruction, when supported."),
  text: z9.string().trim().min(1).max(1e5).describe("Text to speak."),
  voice: z9.string().trim().min(1).max(100).optional().describe("Voice id from media_models.")
});
var EstimateSchema = z9.discriminatedUnion("confidence", [
  z9.object({ confidence: z9.literal("exact"), amountUsd: z9.number().nonnegative() }),
  z9.object({ confidence: z9.literal("range"), minUsd: z9.number().nonnegative(), maxUsd: z9.number().nonnegative() }),
  z9.object({ confidence: z9.literal("unknown") })
]);
var GenerateSpeechOutputSchema = z9.object({
  asset: StateAssetReferenceSchema,
  bytes: z9.number().int().nonnegative(),
  estimate: EstimateSchema,
  format: z9.string(),
  mediaType: z9.string(),
  model: z9.string(),
  path: z9.string(),
  warnings: z9.array(z9.string())
});
async function defaultGenerate(model, request, lineage) {
  return generateSpeech({
    model: zoGateway().speechModel(model),
    text: request.text,
    headers: { [ZO_TOOL_HEADER]: "generate_speech", ...lineage === undefined ? {} : mediaInvocationHeaders(lineage) },
    ...request.voice === undefined ? {} : { voice: request.voice },
    ...request.format === undefined ? {} : { outputFormat: request.format },
    ...request.language === undefined ? {} : { language: request.language },
    ...request.speed === undefined ? {} : { speed: request.speed },
    ...request.style === undefined ? {} : { instructions: request.style }
  });
}
function generateSpeechTool(options = {}) {
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const writer = options.assetWriter ?? createRuntimeStateFilesClient({ declarationName });
  const preflight = options.preflight ?? createAudioPreflight({
    operation: "speech.generate",
    defaultModel: DEFAULT_SPEECH_MODEL,
    ...options.registry === undefined ? {} : { registry: options.registry },
    mapRequest: (input) => ({ text: input.text, ...input.voice === undefined ? {} : { voice: input.voice }, ...input.format === undefined ? {} : { format: input.format }, ...input.language === undefined ? {} : { language: input.language }, ...input.speed === undefined ? {} : { speed: input.speed }, ...input.style === undefined ? {} : { style: input.style } })
  });
  const generate = options.generate ?? defaultGenerate;
  const randomId = options.randomId ?? (() => randomUUID5().slice(0, 8));
  return defineTool6({
    description: "Generate speech with a catalog-supported voice and save it as an audio state asset.",
    inputSchema: GenerateSpeechInputSchema,
    outputSchema: GenerateSpeechOutputSchema,
    async execute(input) {
      const checked = await preflight(input);
      if (!checked.ok)
        throw correctionError3(checked.error);
      const result = await generate(checked.value.model, checked.value.request, checked.value.lineage);
      const extension = result.audio.format || input.format || "mp3";
      const path = audioOutputPath({ ...input.output_dir === undefined ? {} : { outputDir: input.output_dir }, stem: input.text, id: randomId(), extension });
      const asset = await writer.write(path, result.audio.uint8Array, { contentType: result.audio.mediaType });
      return { asset, bytes: result.audio.uint8Array.byteLength, estimate: checked.value.estimate, format: result.audio.format, mediaType: result.audio.mediaType, model: checked.value.model, path, warnings: result.warnings.map(warningText) };
    },
    toModelOutput(output) {
      return { type: "text", value: `Generated speech saved as ${output.asset.declarationName}:${output.asset.path} (${output.format}, ${output.bytes} bytes).` };
    }
  });
}
var generate_speech_default = generateSpeechTool();
// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/transcribe-audio.ts
import { randomUUID as randomUUID6 } from "node:crypto";
import { transcribe } from "ai";
import { defineTool as defineTool7 } from "eve/tools";
import { z as z10 } from "zod";
var DEFAULT_TRANSCRIPTION_MODEL = "openai/whisper-1";
var TranscribeAudioInputSchema = z10.object({
  input_asset: z10.string().trim().startsWith("files:").max(500).describe("Audio state asset, e.g. files:uploads/note.mp3."),
  model: z10.string().trim().min(1).optional().describe("Transcription model id; omit to use the default."),
  output_dir: OutputDirSchema.optional().describe("Directory for a spilled transcript or captions asset."),
  output_format: z10.enum(["text", "json", "srt", "vtt"]).optional().describe("Inline text or a durable transcript/captions format."),
  timestamps: z10.enum(["none", "segment"]).optional().describe("Timestamp detail for segments.")
});
var SegmentSchema = z10.object({ text: z10.string(), startSecond: z10.number(), endSecond: z10.number() });
var AssetSchema = z10.object({ type: z10.literal("state_asset"), declarationName: z10.string(), path: z10.string(), contentType: z10.string().optional(), bytes: z10.number().optional() });
var TranscribeAudioOutputSchema = z10.object({
  detectedLanguage: z10.string().optional(),
  durationSeconds: z10.number().nonnegative().optional(),
  model: z10.string(),
  segments: z10.array(SegmentSchema),
  transcript: z10.string(),
  transcriptAsset: AssetSchema.optional(),
  truncated: z10.boolean(),
  warnings: z10.array(z10.string())
});
async function defaultTranscribe(model, audio2, _request, lineage) {
  const result = await transcribe({ model: zoGateway().transcriptionModel(model), audio: audio2, headers: { [ZO_TOOL_HEADER]: "transcribe_audio", ...lineage === undefined ? {} : mediaInvocationHeaders(lineage) } });
  return {
    text: result.text,
    segments: result.segments,
    ...result.language === undefined ? {} : { language: result.language },
    ...result.durationInSeconds === undefined ? {} : { durationInSeconds: result.durationInSeconds },
    warnings: result.warnings
  };
}
function transcribeAudioTool(options = {}) {
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const store = options.assetStore ?? createRuntimeStateFilesClient({ declarationName });
  const preflight = options.preflight ?? createAudioPreflight({
    operation: "audio.transcribe",
    defaultModel: DEFAULT_TRANSCRIPTION_MODEL,
    assetStore: store,
    ...options.registry === undefined ? {} : { registry: options.registry },
    mapRequest: (input) => ({ inputAsset: input.input_asset, timestamps: input.timestamps ?? "segment" })
  });
  const runProvider = options.transcribe ?? defaultTranscribe;
  const randomId = options.randomId ?? (() => randomUUID6().slice(0, 8));
  const characterLimit = options.inlineCharacterLimit ?? DEFAULT_INLINE_TRANSCRIPT_CHARS;
  const segmentLimit = options.inlineSegmentLimit ?? DEFAULT_INLINE_SEGMENTS;
  return defineTool7({
    description: "Transcribe a bounded audio state asset; long transcripts spill to a durable JSON, SRT, or VTT asset.",
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
    async execute(input) {
      const checked = await preflight(input);
      if (!checked.ok)
        throw correctionError3(checked.error);
      const prefetched = checked.value.resolvedAssets?.[0];
      const ref = parseMediaAssetRef(checked.value.request.inputAsset, declarationName);
      if (ref === null)
        throw new Error("Preflight returned an invalid audio asset reference; no provider request was made.");
      const asset = prefetched ?? await resolveAudioAsset(store, ref);
      const result = await runProvider(checked.value.model, asset.body, checked.value.request, checked.value.lineage);
      const selectedSegments = checked.value.request.timestamps === "none" ? [] : result.segments;
      const outputFormat = input.output_format ?? "text";
      const shouldSpill = outputFormat !== "text" || result.text.length > characterLimit || selectedSegments.length > segmentLimit;
      let transcriptAsset;
      if (shouldSpill) {
        const spillFormat = outputFormat === "text" ? "json" : outputFormat;
        const serialized = serializeTranscript(spillFormat, result.text, selectedSegments);
        const path = audioOutputPath({ ...input.output_dir === undefined ? {} : { outputDir: input.output_dir }, stem: "transcript", id: randomId(), extension: serialized.extension });
        transcriptAsset = await store.write(path, serialized.body, { contentType: serialized.contentType });
      }
      return {
        ...result.language === undefined ? {} : { detectedLanguage: result.language },
        ...result.durationInSeconds === undefined ? {} : { durationSeconds: result.durationInSeconds },
        model: checked.value.model,
        segments: selectedSegments.slice(0, segmentLimit),
        transcript: result.text.slice(0, characterLimit),
        ...transcriptAsset === undefined ? {} : { transcriptAsset },
        truncated: result.text.length > characterLimit || selectedSegments.length > segmentLimit,
        warnings: result.warnings.map(warningText)
      };
    },
    toModelOutput(output) {
      const spill = output.transcriptAsset === undefined ? "" : ` Full transcript: ${output.transcriptAsset.declarationName}:${output.transcriptAsset.path}.`;
      return { type: "text", value: `${output.transcript}${spill}` };
    }
  });
}
var transcribe_audio_default = transcribeAudioTool();
// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/media-contracts.ts
var MEDIA_TOOL_NAMES = [
  "media_models",
  "generate_image",
  "edit_image",
  "generate_video",
  "edit_video",
  "generate_speech",
  "transcribe_audio"
];
// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/web-search.ts
import { generateText } from "ai";
import { defineTool as defineTool8 } from "eve/tools";
import { z as z11 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/search-adapters.ts
import { gateway } from "@ai-sdk/gateway";

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/search-contracts.ts
function validateSearchSettings(settings, definitions, providerId) {
  const declared = new Map(definitions.map((definition) => [definition.name, definition]));
  for (const [name, value] of Object.entries(settings)) {
    if (value === undefined)
      continue;
    const definition = declared.get(name);
    if (definition === undefined) {
      const supported = definitions.map(({ name: settingName }) => settingName).join(", ");
      return `Setting ${name} is not supported by the ${providerId} provider. Supported: ${supported}.`;
    }
    switch (definition.kind) {
      case "enum":
        if (typeof value !== "string" || !definition.values.includes(value))
          return `Setting ${name} must be one of: ${definition.values.join(", ")}.`;
        break;
      case "integer":
        if (typeof value !== "number" || !Number.isInteger(value) || value < definition.min || value > definition.max)
          return `Setting ${name} must be an integer between ${definition.min} and ${definition.max}.`;
        break;
      case "string":
        if (typeof value !== "string" || value.length === 0 || value.length > definition.maxLength)
          return `Setting ${name} must be a non-empty string of at most ${definition.maxLength} characters.`;
        break;
      case "string_list":
        if (!Array.isArray(value) || value.length === 0 || value.length > definition.maxItems || value.some((item) => typeof item !== "string"))
          return `Setting ${name} must be a list of at most ${definition.maxItems} strings.`;
        break;
    }
  }
  return null;
}
var MAX_SEARCH_RESULTS = 20;
var MAX_EXCERPT_CHARS = 2000;
var MAX_TOTAL_EXCERPT_CHARS = 24000;
function parseSearchResultUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0)
    return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:" || url.hostname.length === 0 || url.username.length > 0 || url.password.length > 0) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}
function boundSearchResults(items) {
  const bounded = [];
  let totalChars = 0;
  for (const item of items.slice(0, MAX_SEARCH_RESULTS)) {
    const excerpt = item.excerpt.slice(0, MAX_EXCERPT_CHARS);
    if (totalChars + excerpt.length > MAX_TOTAL_EXCERPT_CHARS)
      break;
    totalChars += excerpt.length;
    bounded.push({ ...item, excerpt });
  }
  return bounded;
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/search-adapters.ts
var gatewayTools = gateway.tools;
var DEFAULT_SEARCH_PROVIDER = "exa";
var SHARED_SETTINGS = [
  { kind: "integer", name: "max_results", description: "Maximum results to return", min: 1, max: 20 },
  { kind: "string_list", name: "include_domains", description: "Restrict results to these domains", maxItems: 10 },
  { kind: "string_list", name: "exclude_domains", description: "Exclude results from these domains", maxItems: 10 },
  { kind: "enum", name: "freshness", description: "Only content published within this window", values: ["day", "week", "month", "year"] }
];
var EXA_CATEGORIES = ["company", "people", "research paper", "news", "personal site", "financial report"];
function freshnessCutoffIso(freshness, now) {
  const days = { day: 1, week: 7, month: 30, year: 365 }[freshness];
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return cutoff.toISOString().slice(0, 10);
}
var SEARCH_PROVIDER_ADAPTERS = [
  {
    id: "exa",
    description: "Exa web search with token-efficient excerpts and highlights.",
    strengths: "Best default: agent-optimized excerpts, search-type and category filters, location-aware results.",
    revision: "2026-07-12.2",
    verifiedAt: "2026-07-12",
    settings: [
      ...SHARED_SETTINGS,
      { kind: "enum", name: "search_type", description: "Search method: auto balances, fast favors latency, instant favors cache", values: ["auto", "fast", "instant"] },
      { kind: "enum", name: "category", description: "Result category filter", values: EXA_CATEGORIES },
      { kind: "string", name: "country", description: "Two-letter ISO country code for location-aware results", maxLength: 2 },
      { kind: "integer", name: "max_chars_per_result", description: "Maximum extracted characters per result", min: 100, max: 1e4 }
    ],
    buildTool: (options) => ({
      name: "exa_search",
      tool: gatewayTools.exaSearch({
        ...options.maxResults === undefined ? {} : { numResults: options.maxResults },
        ...options.includeDomains === undefined ? {} : { includeDomains: [...options.includeDomains] },
        ...options.excludeDomains === undefined ? {} : { excludeDomains: [...options.excludeDomains] },
        ...options.freshness === undefined ? {} : { startPublishedDate: freshnessCutoffIso(options.freshness, options.now()) },
        ...options.searchType === undefined ? {} : { type: options.searchType },
        ...options.category === undefined ? {} : { category: options.category },
        ...options.country === undefined ? {} : { userLocation: options.country },
        contents: {
          highlights: true,
          ...options.maxCharsPerResult === undefined ? {} : { text: { maxCharacters: options.maxCharsPerResult } }
        }
      })
    }),
    parseResults: (output) => {
      const failure = searchToolError(output);
      if (failure !== null)
        return { ok: false, error: failure };
      if (!isRecord7(output) || !Array.isArray(output.results)) {
        return { ok: false, error: "Exa returned an unrecognized result shape." };
      }
      const items = [];
      for (const result of output.results) {
        if (!isRecord7(result) || typeof result.title !== "string")
          continue;
        const url = parseSearchResultUrl(result.url);
        if (url === null)
          continue;
        const highlights = Array.isArray(result.highlights) ? result.highlights.filter((value) => typeof value === "string").join(" … ") : "";
        const excerpt = typeof result.summary === "string" && result.summary.length > 0 ? result.summary : typeof result.text === "string" && result.text.length > 0 ? result.text : highlights;
        items.push({
          title: result.title,
          url,
          excerpt,
          ...typeof result.publishedDate === "string" ? { published: result.publishedDate } : {}
        });
      }
      return { ok: true, value: boundSearchResults(items) };
    }
  },
  {
    id: "parallel",
    description: "Parallel AI search returning LLM-optimized excerpts for one objective.",
    strengths: "Broad or multi-facet research objectives; one call replaces several keyword searches.",
    revision: "2026-07-12.2",
    verifiedAt: "2026-07-12",
    settings: [
      ...SHARED_SETTINGS,
      { kind: "enum", name: "mode", description: "one-shot returns comprehensive excerpts; agentic returns concise token-efficient ones", values: ["one-shot", "agentic"] },
      { kind: "integer", name: "max_chars_per_result", description: "Maximum excerpt characters per result", min: 100, max: 1e4 },
      { kind: "integer", name: "max_age_seconds", description: "Maximum cached-content age; 0 always fetches fresh", min: 0, max: 604800 }
    ],
    buildTool: (options) => ({
      name: "parallel_search",
      tool: gatewayTools.parallelSearch({
        mode: options.mode ?? "agentic",
        ...options.maxResults === undefined ? {} : { maxResults: options.maxResults },
        ...options.maxCharsPerResult === undefined ? {} : { excerpts: { maxCharsPerResult: options.maxCharsPerResult } },
        ...options.maxAgeSeconds === undefined ? {} : { fetchPolicy: { maxAgeSeconds: options.maxAgeSeconds } },
        sourcePolicy: {
          ...options.includeDomains === undefined ? {} : { includeDomains: [...options.includeDomains] },
          ...options.excludeDomains === undefined ? {} : { excludeDomains: [...options.excludeDomains] },
          ...options.freshness === undefined ? {} : { afterDate: freshnessCutoffIso(options.freshness, options.now()) }
        }
      })
    }),
    parseResults: (output) => {
      const failure = searchToolError(output);
      if (failure !== null)
        return { ok: false, error: failure };
      if (!isRecord7(output) || !Array.isArray(output.results)) {
        return { ok: false, error: "Parallel returned an unrecognized result shape." };
      }
      const items = [];
      for (const result of output.results) {
        if (!isRecord7(result) || typeof result.title !== "string")
          continue;
        const url = parseSearchResultUrl(result.url);
        if (url === null)
          continue;
        items.push({
          title: result.title,
          url,
          excerpt: typeof result.excerpt === "string" ? result.excerpt : "",
          ...typeof result.publishDate === "string" ? { published: result.publishDate } : {}
        });
      }
      return { ok: true, value: boundSearchResults(items) };
    }
  },
  {
    id: "perplexity",
    description: "Perplexity web search with regional, language, and recency filters.",
    strengths: "Recency-sensitive queries and regional or language-filtered lookups.",
    revision: "2026-07-12.2",
    verifiedAt: "2026-07-12",
    settings: [
      ...SHARED_SETTINGS,
      { kind: "string", name: "country", description: "Two-letter ISO country code for regional results", maxLength: 2 },
      { kind: "string_list", name: "languages", description: "ISO 639-1 language codes to filter results", maxItems: 10 }
    ],
    buildTool: (options) => ({
      name: "perplexity_search",
      tool: gatewayTools.perplexitySearch({
        ...options.maxResults === undefined ? {} : { maxResults: options.maxResults },
        ...options.includeDomains === undefined && options.excludeDomains === undefined ? {} : {
          searchDomainFilter: [
            ...options.includeDomains ?? [],
            ...(options.excludeDomains ?? []).map((domain) => `-${domain}`)
          ]
        },
        ...options.freshness === undefined ? {} : { searchRecencyFilter: options.freshness },
        ...options.country === undefined ? {} : { country: options.country },
        ...options.languages === undefined ? {} : { searchLanguageFilter: [...options.languages] }
      })
    }),
    parseResults: (output) => {
      const failure = searchToolError(output);
      if (failure !== null)
        return { ok: false, error: failure };
      if (!isRecord7(output) || !Array.isArray(output.results)) {
        return { ok: false, error: "Perplexity returned an unrecognized result shape." };
      }
      const items = [];
      for (const result of output.results) {
        if (!isRecord7(result) || typeof result.title !== "string")
          continue;
        const url = parseSearchResultUrl(result.url);
        if (url === null)
          continue;
        items.push({
          title: result.title,
          url,
          excerpt: typeof result.snippet === "string" ? result.snippet : "",
          ...typeof result.date === "string" ? { published: result.date } : {}
        });
      }
      return { ok: true, value: boundSearchResults(items) };
    }
  }
];
function searchProviderAdapter(id) {
  return SEARCH_PROVIDER_ADAPTERS.find((adapter2) => adapter2.id === id) ?? null;
}
function searchToolError(output) {
  if (isRecord7(output) && typeof output.error === "string" && typeof output.message === "string") {
    return `${output.error}: ${output.message}`;
  }
  return null;
}
function isRecord7(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/web-search.ts
var DEFAULT_SEARCH_DRIVER_MODEL = "google/gemini-3-flash";
var WebSearchInputSchema = z11.object({
  query: z11.string().trim().min(1).max(2000).describe("What to search the web for."),
  provider: z11.enum(["exa", "parallel", "perplexity"]).optional().describe("Search provider; omit for the default. See search_providers."),
  max_results: z11.number().int().min(1).max(20).optional().describe("Maximum results to return."),
  include_domains: z11.array(z11.string().trim().min(1).max(200)).max(10).optional().describe("Restrict results to these domains."),
  exclude_domains: z11.array(z11.string().trim().min(1).max(200)).max(10).optional().describe("Exclude results from these domains."),
  freshness: z11.enum(["day", "week", "month", "year"]).optional().describe("Only include content published within this window."),
  country: z11.string().trim().length(2).optional().describe("Two-letter ISO country code for regional results (exa, perplexity)."),
  search_type: z11.enum(["auto", "fast", "instant"]).optional().describe("Search method (exa)."),
  category: z11.enum(["company", "people", "research paper", "news", "personal site", "financial report"]).optional().describe("Result category filter (exa)."),
  languages: z11.array(z11.string().trim().min(2).max(8)).max(10).optional().describe("ISO 639-1 language codes to filter results (perplexity)."),
  mode: z11.enum(["one-shot", "agentic"]).optional().describe("Excerpt style: comprehensive vs token-efficient (parallel)."),
  max_chars_per_result: z11.number().int().min(100).max(1e4).optional().describe("Maximum extracted characters per result (exa, parallel)."),
  max_age_seconds: z11.number().int().min(0).max(604800).optional().describe("Maximum cached-content age; 0 always fetches fresh (parallel).")
});
var ResultSchema = z11.object({
  title: z11.string(),
  url: z11.string(),
  excerpt: z11.string(),
  published: z11.string().optional()
});
var WebSearchOutputSchema = z11.object({
  provider: z11.string(),
  query: z11.string(),
  results: z11.array(ResultSchema)
});
function webSearchTool(options = {}) {
  const driverModelId = options.driverModelId ?? DEFAULT_SEARCH_DRIVER_MODEL;
  const generate = options.generate ?? generateText;
  const now = options.now ?? (() => new Date);
  return defineTool8({
    description: CLOUD_TOOL_META["web-search"].description,
    inputSchema: WebSearchInputSchema,
    outputSchema: WebSearchOutputSchema,
    async execute(input) {
      const adapter2 = searchProviderAdapter(input.provider ?? DEFAULT_SEARCH_PROVIDER);
      if (adapter2 === null) {
        throw new Error(`Unknown search provider. Choose one of: ${SEARCH_PROVIDER_ADAPTERS.map(({ id }) => id).join(", ")}. No search was run.`);
      }
      const invalid = validateSearchSettings({
        max_results: input.max_results,
        include_domains: input.include_domains,
        exclude_domains: input.exclude_domains,
        freshness: input.freshness,
        country: input.country,
        search_type: input.search_type,
        category: input.category,
        languages: input.languages,
        mode: input.mode,
        max_chars_per_result: input.max_chars_per_result,
        max_age_seconds: input.max_age_seconds
      }, adapter2.settings, adapter2.id);
      if (invalid !== null) {
        throw new Error(`${invalid} No search was run.`);
      }
      const normalized = {
        query: input.query,
        ...input.max_results === undefined ? {} : { maxResults: input.max_results },
        ...input.include_domains === undefined ? {} : { includeDomains: input.include_domains },
        ...input.exclude_domains === undefined ? {} : { excludeDomains: input.exclude_domains },
        ...input.freshness === undefined ? {} : { freshness: input.freshness },
        ...input.country === undefined ? {} : { country: input.country },
        ...input.search_type === undefined ? {} : { searchType: input.search_type },
        ...input.category === undefined ? {} : { category: input.category },
        ...input.languages === undefined ? {} : { languages: input.languages },
        ...input.mode === undefined ? {} : { mode: input.mode },
        ...input.max_chars_per_result === undefined ? {} : { maxCharsPerResult: input.max_chars_per_result },
        ...input.max_age_seconds === undefined ? {} : { maxAgeSeconds: input.max_age_seconds },
        now
      };
      const built = adapter2.buildTool(normalized);
      const lineage = {
        operation: "search.web",
        concreteModelId: driverModelId,
        catalogSnapshotId: null,
        catalogStatus: "unavailable",
        adapterRevision: adapter2.revision,
        estimate: { confidence: "unknown" }
      };
      let driven;
      try {
        driven = await generate({
          model: zoGateway().languageModel(driverModelId),
          prompt: `Call the ${built.name} tool exactly once for this query, verbatim, then stop: ${input.query}`,
          tools: { [built.name]: built.tool },
          toolChoice: { type: "tool", toolName: built.name },
          headers: { [ZO_TOOL_HEADER]: "web_search", ...mediaInvocationHeaders(lineage) }
        });
      } catch (error) {
        throw new Error(`Web search failed before returning results: ${errorText(error)}. Retry, or pick another provider from search_providers.`);
      }
      const output = driven.toolResults.at(-1)?.output;
      if (output === undefined) {
        throw new Error("The search provider returned no tool result. Retry, or pick another provider from search_providers.");
      }
      const parsed = adapter2.parseResults(output);
      if (!parsed.ok) {
        throw new Error(`Web search failed: ${parsed.error} Retry, or pick another provider from search_providers.`);
      }
      return { provider: adapter2.id, query: input.query, results: [...parsed.value] };
    },
    toModelOutput(output) {
      if (output.results.length === 0) {
        return { type: "text", value: `No results from ${output.provider} for: ${output.query}` };
      }
      return {
        type: "text",
        value: output.results.map((result, index) => formatResult(result, index)).join(`

`)
      };
    }
  });
}
function formatResult(result, index) {
  const date = result.published === undefined ? "" : ` (${result.published})`;
  return `${index + 1}. ${result.title}${date}
${result.url}
${result.excerpt}`;
}
function errorText(error) {
  return error instanceof Error ? error.message.slice(0, 500) : "unknown error";
}
var web_search_default = webSearchTool();
// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/search-providers.ts
import { defineTool as defineTool9 } from "eve/tools";
import { z as z12 } from "zod";
var SearchProvidersInputSchema = z12.object({
  provider: z12.enum(["exa", "parallel", "perplexity"]).optional().describe("Inspect one provider; omit to list all.")
});
var SettingSchema = z12.object({
  name: z12.string(),
  kind: z12.string(),
  description: z12.string(),
  values: z12.array(z12.string()).optional(),
  min: z12.number().optional(),
  max: z12.number().optional()
});
var ProviderSchema = z12.object({
  id: z12.string(),
  description: z12.string(),
  strengths: z12.string(),
  settings: z12.array(SettingSchema),
  adapter_revision: z12.string(),
  verified_at: z12.string()
});
var SearchProvidersOutputSchema = z12.object({
  default_provider: z12.string(),
  providers: z12.array(ProviderSchema)
});
function searchProvidersTool() {
  return defineTool9({
    description: CLOUD_TOOL_META["search-providers"].description,
    inputSchema: SearchProvidersInputSchema,
    outputSchema: SearchProvidersOutputSchema,
    execute(input) {
      const roster = SEARCH_PROVIDER_ADAPTERS.filter((adapter2) => input.provider === undefined || adapter2.id === input.provider);
      if (roster.length === 0) {
        throw new Error(`Unknown provider. Choose one of: ${SEARCH_PROVIDER_ADAPTERS.map(({ id }) => id).join(", ")}.`);
      }
      return {
        default_provider: "exa",
        providers: roster.map((adapter2) => ({
          id: adapter2.id,
          description: adapter2.description,
          strengths: adapter2.strengths,
          settings: adapter2.settings.map((setting) => ({
            name: setting.name,
            kind: setting.kind,
            description: setting.description,
            ...setting.kind === "enum" ? { values: [...setting.values] } : {},
            ...setting.kind === "integer" ? { min: setting.min, max: setting.max } : {}
          })),
          adapter_revision: adapter2.revision,
          verified_at: adapter2.verifiedAt
        }))
      };
    },
    toModelOutput(output) {
      return {
        type: "text",
        value: output.providers.map((provider) => {
          const settings = provider.settings.map((setting) => setting.values === undefined ? setting.name : `${setting.name} (${setting.values.join("|")})`).join(", ");
          return `${provider.id}${provider.id === output.default_provider ? " (default)" : ""}: ${provider.strengths} Settings: ${settings}.`;
        }).join(`
`)
      };
    }
  });
}
var search_providers_default = searchProvidersTool();
// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/x-search.ts
import { xaiTools } from "@ai-sdk/xai";
import { generateText as generateText2 } from "ai";
import { defineTool as defineTool10 } from "eve/tools";
import { z as z13 } from "zod";
var DEFAULT_X_SEARCH_DRIVER_MODEL = "xai/grok-4.3";
var X_SEARCH_ADAPTER_REVISION = "2026-07-12.1";
var MAX_POST_CHARS = 1000;
var MAX_POSTS = 20;
var IsoDateSchema = z13.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Use YYYY-MM-DD.");
var XSearchInputSchema = z13.object({
  query: z13.string().trim().min(1).max(2000).describe("What to search X (Twitter) for."),
  allowed_x_handles: z13.array(z13.string().trim().min(1).max(50)).max(20).optional().describe("Only consider posts from these handles."),
  excluded_x_handles: z13.array(z13.string().trim().min(1).max(50)).max(20).optional().describe("Exclude posts from these handles."),
  from_date: IsoDateSchema.optional().describe("Earliest post date, YYYY-MM-DD."),
  to_date: IsoDateSchema.optional().describe("Latest post date, YYYY-MM-DD."),
  enable_image_understanding: z13.boolean().optional().describe("Analyze images in posts during the search."),
  enable_video_understanding: z13.boolean().optional().describe("Analyze videos in posts during the search.")
});
var PostSchema = z13.object({
  author: z13.string(),
  text: z13.string(),
  url: z13.string(),
  likes: z13.number()
});
var XSearchOutputSchema = z13.object({
  query: z13.string(),
  posts: z13.array(PostSchema)
});
function xSearchTool(options = {}) {
  const driverModelId = options.driverModelId ?? DEFAULT_X_SEARCH_DRIVER_MODEL;
  const generate = options.generate ?? generateText2;
  return defineTool10({
    description: CLOUD_TOOL_META["x-search"].description,
    inputSchema: XSearchInputSchema,
    outputSchema: XSearchOutputSchema,
    async execute(input) {
      if (input.allowed_x_handles !== undefined && input.excluded_x_handles !== undefined) {
        throw new Error("Give allowed_x_handles or excluded_x_handles, not both. No search was run.");
      }
      const tool = xaiTools.xSearch({
        ...input.allowed_x_handles === undefined ? {} : { allowedXHandles: [...input.allowed_x_handles] },
        ...input.excluded_x_handles === undefined ? {} : { excludedXHandles: [...input.excluded_x_handles] },
        ...input.from_date === undefined ? {} : { fromDate: input.from_date },
        ...input.to_date === undefined ? {} : { toDate: input.to_date },
        ...input.enable_image_understanding === undefined ? {} : { enableImageUnderstanding: input.enable_image_understanding },
        ...input.enable_video_understanding === undefined ? {} : { enableVideoUnderstanding: input.enable_video_understanding }
      });
      const lineage = {
        operation: "search.x",
        concreteModelId: driverModelId,
        catalogSnapshotId: null,
        catalogStatus: "unavailable",
        adapterRevision: X_SEARCH_ADAPTER_REVISION,
        estimate: { confidence: "unknown" }
      };
      let driven;
      try {
        driven = await generate({
          model: zoGateway().languageModel(driverModelId),
          prompt: `Call the x_search tool exactly once for this query, verbatim, then stop: ${input.query}`,
          tools: { x_search: tool },
          toolChoice: { type: "tool", toolName: "x_search" },
          headers: { [ZO_TOOL_HEADER]: "x_search", ...mediaInvocationHeaders(lineage) }
        });
      } catch (error) {
        throw new Error(`X search failed before returning results: ${errorText2(error)}. Retry with a simpler query.`);
      }
      const posts = parsePosts(driven.toolResults.at(-1)?.output);
      if (posts === null) {
        throw new Error("The X search returned no readable posts. Retry with a simpler query.");
      }
      return { query: input.query, posts: [...posts] };
    },
    toModelOutput(output) {
      if (output.posts.length === 0) {
        return { type: "text", value: `No X posts found for: ${output.query}` };
      }
      return {
        type: "text",
        value: output.posts.map((post, index) => `${index + 1}. @${post.author} (${post.likes} likes)
${post.url}
${post.text}`).join(`

`)
      };
    }
  });
}
function parsePosts(output) {
  if (!isRecord8(output) || !Array.isArray(output.posts))
    return null;
  const posts = [];
  for (const post of output.posts.slice(0, MAX_POSTS)) {
    if (!isRecord8(post) || typeof post.author !== "string" || typeof post.text !== "string")
      continue;
    const url = parseSearchResultUrl(post.url);
    if (url === null)
      continue;
    posts.push({
      author: post.author,
      text: post.text.slice(0, MAX_POST_CHARS),
      url,
      likes: typeof post.likes === "number" && Number.isFinite(post.likes) ? post.likes : 0
    });
  }
  return posts;
}
function errorText2(error) {
  return error instanceof Error ? error.message.slice(0, 500) : "unknown error";
}
function isRecord8(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var x_search_default = xSearchTool();
// ../../../../../tmp/agent-sdk-mirror-wItKVV/repo/platform/cloud-tools/maps-search.ts
import { google } from "@ai-sdk/google";
import { generateText as generateText3 } from "ai";
import { defineTool as defineTool11 } from "eve/tools";
import { z as z14 } from "zod";
var DEFAULT_MAPS_SEARCH_DRIVER_MODEL = "google/gemini-3-flash";
var MAPS_SEARCH_ADAPTER_REVISION = "2026-07-12.1";
var MAX_ANSWER_CHARS = 8000;
var MAX_SOURCES = 20;
var MapsSearchInputSchema = z14.object({
  query: z14.string().trim().min(1).max(2000).describe("A places/geography question, e.g. 'coffee shops near the Ferry Building open after 9pm'.")
});
var SourceSchema = z14.object({
  url: z14.string(),
  title: z14.string().optional()
});
var MapsSearchOutputSchema = z14.object({
  query: z14.string(),
  answer: z14.string(),
  sources: z14.array(SourceSchema)
});
function mapsSearchTool(options = {}) {
  const driverModelId = options.driverModelId ?? DEFAULT_MAPS_SEARCH_DRIVER_MODEL;
  const generate = options.generate ?? generateText3;
  return defineTool11({
    description: CLOUD_TOOL_META["maps-search"].description,
    inputSchema: MapsSearchInputSchema,
    outputSchema: MapsSearchOutputSchema,
    async execute(input) {
      const lineage = {
        operation: "search.maps",
        concreteModelId: driverModelId,
        catalogSnapshotId: null,
        catalogStatus: "unavailable",
        adapterRevision: MAPS_SEARCH_ADAPTER_REVISION,
        estimate: { confidence: "unknown" }
      };
      const googleMapsTool = google.tools.googleMaps({});
      let driven;
      try {
        driven = await generate({
          model: zoGateway().languageModel(driverModelId),
          prompt: `Answer this places question using Google Maps data. Be specific: names, addresses, and hours where relevant. Question: ${input.query}`,
          tools: { google_maps: googleMapsTool },
          headers: { [ZO_TOOL_HEADER]: "maps_search", ...mediaInvocationHeaders(lineage) }
        });
      } catch (error) {
        throw new Error(`Maps search failed before returning an answer: ${errorText3(error)}. Retry with a simpler question.`);
      }
      const answer = driven.text.trim();
      if (answer.length === 0) {
        throw new Error("Maps search returned an empty answer. Retry with a simpler question.");
      }
      const sources = parseSources(driven.sources);
      if (sources.length === 0) {
        throw new Error("Maps search produced an answer without Maps grounding sources; it was discarded. Retry with a more specific places question.");
      }
      return {
        query: input.query,
        answer: answer.slice(0, MAX_ANSWER_CHARS),
        sources
      };
    },
    toModelOutput(output) {
      const sources = output.sources.length === 0 ? "" : `

Sources:
${output.sources.map((source) => `- ${source.title ?? source.url}: ${source.url}`).join(`
`)}`;
      return { type: "text", value: `${output.answer}${sources}` };
    }
  });
}
function parseSources(sources) {
  const parsed = [];
  for (const source of sources.slice(0, MAX_SOURCES)) {
    if (!isRecord9(source))
      continue;
    const url = parseSearchResultUrl(source.url);
    if (url === null)
      continue;
    const title = typeof source.title === "string" ? source.title.trim() : "";
    parsed.push({ url, ...title.length === 0 ? {} : { title } });
  }
  return parsed;
}
function errorText3(error) {
  return error instanceof Error ? error.message.slice(0, 500) : "unknown error";
}
function isRecord9(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var maps_search_default = mapsSearchTool();
export {
  xSearchTool,
  x_search_default as xSearch,
  webSearchTool,
  web_search_default as webSearch,
  warningText,
  validateSearchSettings,
  transcribeAudioTool,
  stateAssetReference,
  sniffMediaAsset,
  serializeMediaInvocationLineage,
  searchProvidersTool,
  search_providers_default as searchProviders,
  searchProviderAdapter,
  saveFailure,
  parseSearchResultUrl,
  parseMediaAssetRef,
  normalizeMediaAssetPath,
  mediaModelsTool,
  media_models_default_default as mediaModels,
  mediaInvocationHeaders,
  mapsSearchTool,
  maps_search_default as mapsSearch,
  generationFailure,
  generateVideoTool,
  video_default as generateVideo,
  generateSpeechTool,
  generateImageTool,
  image_default as generateImage,
  formatMediaAssetRef,
  editVideoTool,
  editImageTool,
  defaultMediaRegistry,
  createRuntimeStateFilesClient,
  boundSearchResults,
  assertMediaAssetRef,
  ZO_MEDIA_LINEAGE_HEADER,
  XSearchOutputSchema,
  XSearchInputSchema,
  WebSearchOutputSchema,
  WebSearchInputSchema,
  TranscribeAudioOutputSchema,
  TranscribeAudioInputSchema,
  StateAssetReferenceSchema,
  SearchProvidersOutputSchema,
  SearchProvidersInputSchema,
  SEARCH_PROVIDER_ADAPTERS,
  MapsSearchOutputSchema,
  MapsSearchInputSchema,
  MEDIA_TOOL_NAMES,
  MAX_TOTAL_EXCERPT_CHARS,
  MAX_SEARCH_RESULTS,
  MAX_MEDIA_LINEAGE_HEADER_LENGTH,
  MAX_EXCERPT_CHARS,
  GeneratedAssetOutputSchema,
  GenerateVideoOutputSchema,
  GenerateVideoInputSchema,
  GenerateSpeechOutputSchema,
  GenerateSpeechInputSchema,
  GenerateImageOutputSchema,
  GenerateImageInputSchema,
  EditVideoOutputSchema,
  EditVideoInputSchema,
  EditImageOutputSchema,
  EditImageInputSchema,
  DEFAULT_X_SEARCH_DRIVER_MODEL,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_VIDEO_EDIT_MODEL,
  DEFAULT_TRANSCRIPTION_MODEL,
  DEFAULT_STATE_ASSET_DECLARATION_NAME,
  DEFAULT_SPEECH_MODEL,
  DEFAULT_SEARCH_PROVIDER,
  DEFAULT_SEARCH_DRIVER_MODEL,
  DEFAULT_MAPS_SEARCH_DRIVER_MODEL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_EDIT_MODEL
};
