// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/edit-image.ts
import { randomUUID } from "node:crypto";
import { generateImage } from "ai";
import { defineTool as defineTool2 } from "eve/tools";
import { z as z5 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/runtime-ai/gateway.ts
import { createGateway } from "ai";

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/runtime-ai/session-fetch.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/runtime-ai/stream-guards.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/runtime-ai/gateway-config.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/runtime-ai/gateway.ts
function zoGateway(options = {}) {
  return createGateway(zoGatewaySettings(options));
}
// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/runtime-ai/catalog.ts
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
// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/asset-path.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/media-asset.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/media-preflight.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/media-catalog-parser.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/media-catalog-snapshot.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/media-catalog-cache.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/media-models.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/media-adapters.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/media-registry.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/media-models-default.ts
var catalog = createMediaCatalogCache({
  refresh: (validators) => fetchMediaCatalog(validators === undefined ? {} : { validators })
});
async function defaultMediaRegistry() {
  const loaded = await catalog.get();
  return loaded.ok ? { ok: true, value: createMediaRegistry(loaded.value.models, loaded.value.lineage) } : loaded;
}
var media_models_default_default = mediaModelsTool({ registry: defaultMediaRegistry });

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/image-lane.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/media-lineage.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/tool-shared.ts
import { z as z4 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/state-consent.ts
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/state-files.ts
var DEFAULT_STATE_ASSET_DECLARATION_NAME = "files";
var STATE_FILES_HANDLE_PATH = "/state/handles";
var ZO_AGENT_TOKEN_HEADER = "x-zo-agent-token";
var ZO_EVE_SESSION_HEADER = "x-zo-eve-session";
var DEFAULT_STATE_FILES_SUGGESTED_DEFAULTS = Object.freeze({
  engine: "zo-blob-r2",
  partition: "session"
});

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
  const getSessionId = options.getSessionId ?? ambientEveSessionId;
  const now = options.now ?? (() => new Date);
  return {
    async resolveUrl(ref, expiresInSeconds) {
      if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds <= 0) {
        throw new StateFilesRuntimeError("media URL expiry must be a positive safe integer");
      }
      const trustedRef = assertMediaAssetRef(ref, declarationName);
      const eveSessionKey = getSessionId();
      const handle = await requestRuntimeStateFilesHandle({
        access: "r",
        apiBaseUrl: resolveApiBaseUrl(options.apiBaseUrl),
        agentToken: resolveAgentToken(options.agentToken),
        declarationName,
        fetch: fetchImpl,
        now,
        suggestedDefaults: options.suggestedDefaults ?? DEFAULT_STATE_FILES_SUGGESTED_DEFAULTS,
        ...eveSessionKey === undefined ? {} : { eveSessionKey }
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
      const trustedRef = assertMediaAssetRef(ref, declarationName);
      const eveSessionKey = getSessionId();
      const handle = await requestRuntimeStateFilesHandle({
        access: "r",
        apiBaseUrl: resolveApiBaseUrl(options.apiBaseUrl),
        agentToken: resolveAgentToken(options.agentToken),
        declarationName,
        fetch: fetchImpl,
        now,
        suggestedDefaults: options.suggestedDefaults ?? DEFAULT_STATE_FILES_SUGGESTED_DEFAULTS,
        ...eveSessionKey === undefined ? {} : { eveSessionKey }
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
      const handle = await requestRuntimeStateFilesHandle({
        access: "rw",
        apiBaseUrl: resolveApiBaseUrl(options.apiBaseUrl),
        agentToken: resolveAgentToken(options.agentToken),
        declarationName,
        fetch: fetchImpl,
        now,
        suggestedDefaults: options.suggestedDefaults ?? DEFAULT_STATE_FILES_SUGGESTED_DEFAULTS,
        ...eveSessionKey === undefined ? {} : { eveSessionKey }
      });
      if (handle.access !== "rw") {
        throw new StateFilesRuntimeError(`the "${handle.declarationName}" state files handle is read-only, so nothing can be written — the agent's state configuration must allow writes`);
      }
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
        declarationName,
        path: key,
        ...writeOptions?.contentType === undefined ? {} : { contentType: writeOptions.contentType },
        bytes: body.byteLength
      });
    }
  };
}
function stateAssetReference(input) {
  return Object.freeze({
    type: "state_asset",
    declarationName: input.declarationName,
    path: normalizeStateFilePath(input.path),
    ...input.contentType === undefined ? {} : { contentType: input.contentType },
    ...input.bytes === undefined ? {} : { bytes: input.bytes }
  });
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
  const response = await options.fetch(buildStateFilesHandleUrl(options.apiBaseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({
      declarationName: options.declarationName,
      interface: "files",
      access: options.access,
      suggestedDefaults: options.suggestedDefaults
    })
  });
  const json = await response.json().catch(() => null);
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
  if (handle.declarationName !== options.declarationName) {
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
function buildStateFilesHandleUrl(apiBaseUrl) {
  const url = new URL(apiBaseUrl);
  url.pathname = `${url.pathname.replace(/\/+$/u, "")}/${STATE_FILES_HANDLE_PATH.replace(/^\/+/, "")}`;
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
  const error = isRecord5(value.error) ? value.error : value;
  return readString(error, "message") ?? "state files broker request failed";
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/tool-shared.ts
var StateAssetReferenceSchema = z4.object({
  bytes: z4.number().int().nonnegative().optional(),
  contentType: z4.string().optional(),
  declarationName: z4.string(),
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

// ../../../../../tmp/agent-sdk-mirror-fZqm4O/repo/platform/cloud-tools/edit-image.ts
var DEFAULT_IMAGE_EDIT_MODEL = "bfl/flux-kontext-pro";
var AspectRatioSchema = z5.templateLiteral([z5.number().int().positive(), ":", z5.number().int().positive()]);
var EditImageInputSchema = z5.object({
  input_asset: z5.string().trim().startsWith("files:"),
  prompt: z5.string().trim().min(1).max(4000),
  model: z5.string().trim().min(1).optional(),
  mask_asset: z5.string().trim().startsWith("files:").optional(),
  reference_asset: z5.string().trim().startsWith("files:").optional(),
  aspect_ratio: AspectRatioSchema.optional(),
  safety: z5.enum(["strict", "standard", "relaxed"]).optional().describe("Content moderation strictness, when the model supports it."),
  output_dir: OutputDirSchema.optional()
});
var EditImageOutputSchema = z5.object({ asset: StateAssetReferenceSchema, model: z5.string(), prompt: z5.string(), warnings: z5.array(z5.string()) });
function editImageTool(options = {}) {
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const assetStore = options.assetStore ?? createRuntimeStateFilesClient({ declarationName });
  const preflight = options.preflight ?? createImagePreflight({ operation: "image.edit", assetStore, defaultModel: DEFAULT_IMAGE_EDIT_MODEL, ...options.registry === undefined ? {} : { registry: options.registry } });
  const generate = options.generate ?? generateImage;
  const randomId = options.randomId ?? (() => randomUUID().slice(0, 8));
  return defineTool2({
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
      if (aspectRatio !== undefined && !isAspectRatio(aspectRatio))
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
function isAspectRatio(value) {
  return /^[1-9]\d*:[1-9]\d*$/u.test(value);
}
export {
  editImageTool,
  edit_image_default as default,
  EditImageOutputSchema,
  EditImageInputSchema,
  DEFAULT_IMAGE_EDIT_MODEL
};
