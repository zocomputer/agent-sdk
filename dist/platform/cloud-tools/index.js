// ../../../../../tmp/agent-sdk-mirror-Fbmnuq/repo/platform/cloud-tools/image.ts
import { randomUUID } from "node:crypto";
import { generateImage } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

// ../../../../../tmp/agent-sdk-mirror-Fbmnuq/repo/platform/runtime-ai/gateway.ts
import { createGateway } from "ai";

// ../../../../../tmp/agent-sdk-mirror-Fbmnuq/repo/platform/runtime-ai/session-fetch.ts
var EVE_SESSION_HEADER = "x-zo-eve-session";
var EVE_TURN_HEADER = "x-zo-eve-turn";
var EVE_CONTEXT_STORAGE_KEY = Symbol.for("eve.context-storage");
var SESSION_ID_KEY_NAME = "eve.sessionId";
var SESSION_KEY_NAME = "eve.session";
function hasMethod(value, name) {
  return typeof value === "object" && value !== null && typeof value[name] === "function";
}
function ambientEveSessionId() {
  const value = ambientContextValue(SESSION_ID_KEY_NAME);
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
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
function eveSessionFetch(getSessionId = ambientEveSessionId, baseFetch = globalThis.fetch, getTurnId = ambientEveTurnId) {
  return Object.assign((input, init) => {
    const sessionId = getSessionId()?.trim();
    if (!sessionId)
      return baseFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set(EVE_SESSION_HEADER, sessionId);
    const turnId = getTurnId()?.trim();
    if (turnId)
      headers.set(EVE_TURN_HEADER, turnId);
    else
      headers.delete(EVE_TURN_HEADER);
    return baseFetch(input, { ...init, headers });
  }, baseFetch);
}

// ../../../../../tmp/agent-sdk-mirror-Fbmnuq/repo/platform/runtime-ai/gateway.ts
var ZO_TOOL_HEADER = "x-zo-tool";
var DEFAULT_ZO_AI_BASE_URL = "http://localhost:4000/runtime/ai/v4/ai";
var DEFAULT_ZO_AI_KEY = "dev-proxy";
function resolveZoGatewayBaseUrl(baseURL = process.env.ZO_AI_BASE_URL) {
  const trimmed = baseURL?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_BASE_URL;
}
function resolveZoGatewayApiKey(apiKey = process.env.ZO_AI_KEY) {
  const trimmed = apiKey?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_KEY;
}
function zoGateway(options = {}) {
  return createGateway({
    ...options,
    apiKey: resolveZoGatewayApiKey(options.apiKey),
    baseURL: resolveZoGatewayBaseUrl(options.baseURL),
    fetch: eveSessionFetch(undefined, options.fetch)
  });
}
// ../../../../../tmp/agent-sdk-mirror-Fbmnuq/repo/platform/cloud-tools/image-path.ts
var DEFAULT_IMAGE_OUTPUT_DIR = "generated";
var MEDIA_TYPE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};
function extensionForMediaType(mediaType) {
  return MEDIA_TYPE_EXTENSIONS[mediaType] ?? "bin";
}
function slugForPrompt(prompt) {
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return slug.length > 0 ? slug : "image";
}
function normalizedOutputDir(outputDir) {
  const trimmed = outputDir?.trim();
  const dir = trimmed && trimmed.length > 0 ? trimmed : DEFAULT_IMAGE_OUTPUT_DIR;
  const withoutTrailingSlash = dir.replace(/\/+$/g, "");
  return withoutTrailingSlash.length > 0 ? withoutTrailingSlash : DEFAULT_IMAGE_OUTPUT_DIR;
}
function imageOutputPath(input) {
  return `${normalizedOutputDir(input.outputDir)}/${slugForPrompt(input.prompt)}-${input.id}.${extensionForMediaType(input.mediaType)}`;
}

// ../../../../../tmp/agent-sdk-mirror-Fbmnuq/repo/platform/cloud-tools/tool-meta.ts
var CLOUD_TOOL_META = {
  image: {
    description: "Generate an image from a text prompt and save it as an external state asset."
  }
};

// ../../../../../tmp/agent-sdk-mirror-Fbmnuq/repo/platform/cloud-tools/state-files.ts
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
function createRuntimeStateFilesClient(options = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const getSessionId = options.getSessionId ?? ambientEveSessionId;
  const now = options.now ?? (() => new Date);
  return {
    async write(path, body, writeOptions) {
      const key = normalizeStateFilePath(path);
      const eveSessionKey = getSessionId();
      const handle = await requestRuntimeStateFilesHandle({
        apiBaseUrl: resolveApiBaseUrl(options.apiBaseUrl),
        agentToken: resolveAgentToken(options.agentToken),
        declarationName,
        fetch: fetchImpl,
        suggestedDefaults: options.suggestedDefaults ?? DEFAULT_STATE_FILES_SUGGESTED_DEFAULTS,
        ...eveSessionKey === undefined ? {} : { eveSessionKey }
      });
      if (handle.access !== "rw") {
        throw new StateFilesRuntimeError(`state files handle "${handle.handleId}" is read-only`);
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
  if (path.length === 0)
    throw new Error("state file path must not be empty");
  if (path.startsWith("/"))
    throw new Error(`state file path "${path}" must be relative`);
  const segments = path.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new Error(`state file path "${path}" must not contain empty, . or .. segments`);
  }
  return path;
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
      access: "rw",
      suggestedDefaults: options.suggestedDefaults
    })
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new StateFilesRuntimeError(readBrokerErrorMessage(json));
  }
  const handle = parseStateFilesHandle(json);
  if (handle === null) {
    throw new StateFilesRuntimeError("state files broker returned a malformed handle");
  }
  return handle;
}
function resolveApiBaseUrl(apiBaseUrl) {
  const value = String(apiBaseUrl ?? process.env.ZO_API_URL ?? "").trim();
  if (value.length === 0) {
    throw new StateFilesRuntimeError("ZO_API_URL is required to write generated state assets");
  }
  return value;
}
function resolveAgentToken(agentToken) {
  const value = (agentToken ?? process.env.ZO_AGENT_TOKEN ?? "").trim();
  if (value.length === 0) {
    throw new StateFilesRuntimeError("ZO_AGENT_TOKEN is required to write generated state assets");
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
  if (!isRecord(value))
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
  if (!isRecord(value))
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
function readBrokerErrorMessage(value) {
  if (!isRecord(value))
    return "state files broker request failed";
  const error = isRecord(value.error) ? value.error : value;
  return readString(error, "message") ?? "state files broker request failed";
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
    throw new StateFilesRuntimeError(`state asset write failed with ${response.status}`);
  }
}
function stateFileObjectUrl(endpoint, bucketName, key) {
  const base = endpoint.replace(/\/+$/u, "");
  return new URL(`${base}/${encodeS3PathSegment(bucketName)}/${encodeS3Key(key)}`);
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
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

// ../../../../../tmp/agent-sdk-mirror-Fbmnuq/repo/platform/cloud-tools/image.ts
var DEFAULT_IMAGE_MODEL = "bfl/flux-2-pro";
function isImageSize(value) {
  return typeof value === "string" && /^[1-9]\d{1,4}x[1-9]\d{1,4}$/u.test(value);
}
function isImageAspectRatio(value) {
  return typeof value === "string" && /^[1-9]\d{0,2}:[1-9]\d{0,2}$/u.test(value);
}
var SizeSchema = z.templateLiteral([z.number().int().positive(), "x", z.number().int().positive()]).refine(isImageSize, { message: "Use WIDTHxHEIGHT, for example 1024x1024." });
var AspectRatioSchema = z.templateLiteral([z.number().int().positive(), ":", z.number().int().positive()]).refine(isImageAspectRatio, { message: "Use WIDTH:HEIGHT, for example 1:1 or 16:9." });
var ImageDimensionsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("auto") }).strict(),
  z.object({ kind: z.literal("size"), size: SizeSchema }).strict(),
  z.object({
    aspectRatio: AspectRatioSchema,
    kind: z.literal("aspectRatio")
  }).strict()
]);
var OutputDirSchema = z.string().trim().min(1).max(200).regex(/^(?!\/)(?!.*\/$)(?!.*\/\/)(?!.*(?:^|\/)(?:\.|\.\.)(?:\/|$))[A-Za-z0-9._/-]+$/u, "Use a relative state file path without empty, . or .. segments.");
var GenerateImageInputSchema = z.object({
  dimensions: ImageDimensionsSchema.optional(),
  model: z.string().trim().min(1).optional(),
  outputDir: OutputDirSchema.optional(),
  prompt: z.string().trim().min(1).max(4000),
  seed: z.number().int().nonnegative().optional()
}).strict();
var StateAssetReferenceSchema = z.object({
  bytes: z.number().int().nonnegative().optional(),
  contentType: z.string().optional(),
  declarationName: z.string(),
  path: z.string(),
  type: z.literal("state_asset")
}).strict();
var GenerateImageOutputSchema = z.object({
  asset: StateAssetReferenceSchema,
  bytes: z.number().int().nonnegative(),
  mediaType: z.string(),
  model: z.string(),
  path: z.string(),
  prompt: z.string(),
  warnings: z.array(z.string())
}).strict();
function assertNever(value) {
  throw new Error(`Unhandled generate_image dimensions: ${JSON.stringify(value)}`);
}
function imageDimensionSettings(dimensions) {
  if (dimensions === undefined || dimensions.kind === "auto") {
    return {};
  }
  switch (dimensions.kind) {
    case "aspectRatio":
      return { aspectRatio: dimensions.aspectRatio };
    case "size":
      return { size: dimensions.size };
    default:
      return assertNever(dimensions);
  }
}
function warningText(warning) {
  if (warning instanceof Error) {
    return warning.message;
  }
  if (typeof warning === "string") {
    return warning;
  }
  const json = JSON.stringify(warning);
  return json ?? String(warning);
}
function randomImageId() {
  return randomUUID().slice(0, 8);
}
function generateImageTool(options = {}) {
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const assetWriter = options.assetWriter ?? createRuntimeStateFilesClient({ declarationName });
  const generate = options.generate ?? generateImage;
  const randomId = options.randomId ?? randomImageId;
  return defineTool({
    description: CLOUD_TOOL_META.image.description,
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
    async execute(input) {
      const model = input.model ?? DEFAULT_IMAGE_MODEL;
      const result = await generate({
        headers: { [ZO_TOOL_HEADER]: "generate_image" },
        model: zoGateway().imageModel(model),
        prompt: input.prompt,
        ...imageDimensionSettings(input.dimensions),
        ...input.seed === undefined ? {} : { seed: input.seed }
      });
      const image = result.image;
      const path = imageOutputPath({
        id: randomId(),
        mediaType: image.mediaType,
        outputDir: input.outputDir,
        prompt: input.prompt
      });
      await assetWriter.write(path, image.uint8Array, { contentType: image.mediaType });
      const asset = stateAssetReference({
        type: "state_asset",
        declarationName,
        path,
        contentType: image.mediaType,
        bytes: image.uint8Array.byteLength
      });
      return {
        asset,
        bytes: image.uint8Array.byteLength,
        mediaType: image.mediaType,
        model,
        path,
        prompt: input.prompt,
        warnings: result.warnings.map(warningText)
      };
    },
    toModelOutput(output) {
      return {
        type: "text",
        value: `Generated image saved as state asset ${output.asset.declarationName}:${output.asset.path}. ` + `The asset is available to the chat UI through the state_asset reference; ` + `do not invent or expose a temporary URL.`
      };
    }
  });
}
var image_default = generateImageTool();
// ../../../../../tmp/agent-sdk-mirror-Fbmnuq/repo/platform/cloud-tools/web-search.ts
function webSearch(config) {
  const gateway = zoGateway();
  return config === undefined ? gateway.tools.exaSearch() : gateway.tools.exaSearch(config);
}
export {
  webSearch,
  stateAssetReference,
  generateImageTool,
  image_default as generateImage,
  createRuntimeStateFilesClient,
  GenerateImageOutputSchema,
  GenerateImageInputSchema,
  DEFAULT_STATE_ASSET_DECLARATION_NAME,
  DEFAULT_IMAGE_MODEL
};
