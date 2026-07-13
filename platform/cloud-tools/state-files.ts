import { ambientEveSessionId } from "../runtime-ai/session-fetch.ts";

import { buildConsentSteer, type ConsentEnvelope, parseConsentEnvelope } from "./state-consent";
import { assertMediaAssetRef, normalizeMediaAssetPath, sniffMediaAsset } from "./media-asset";
import type { MediaAssetRef, ResolvedMediaAsset } from "./media-contracts";

export const DEFAULT_STATE_ASSET_DECLARATION_NAME = "files";
export const STATE_FILES_HANDLE_PATH = "/state/handles";
export const ZO_AGENT_TOKEN_HEADER = "x-zo-agent-token";
export const ZO_EVE_SESSION_HEADER = "x-zo-eve-session";

const DEFAULT_STATE_FILES_SUGGESTED_DEFAULTS: RuntimeStateFilesSuggestedDefaults = Object.freeze({
  engine: "zo-blob-r2",
  partition: "session",
});

export interface StateAssetReference {
  readonly type: "state_asset";
  readonly declarationName: string;
  readonly path: string;
  readonly contentType?: string;
  readonly bytes?: number;
}

interface StateFilesCredentials {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly sessionToken: string;
  readonly expiresAt: string;
}

interface StateFilesHandle {
  readonly handleId: string;
  readonly declarationName: string;
  readonly interface: "files";
  readonly access: "r" | "rw";
  readonly engine: "zo-blob-r2";
  readonly bucketName: string;
  readonly endpoint: string;
  readonly credentials: StateFilesCredentials;
}

export interface StateFilesWriteOptions {
  readonly contentType?: string;
}

export interface StateFilesAssetWriter {
  write(path: string, body: Uint8Array, options?: StateFilesWriteOptions): Promise<MediaAssetRef>;
}

export interface StateFilesAssetStore extends StateFilesAssetWriter {
  read(ref: MediaAssetRef, limits: { readonly maxBytes: number }): Promise<ResolvedMediaAsset>;
  resolveUrl?(ref: MediaAssetRef, expiresInSeconds: number): Promise<URL>;
}

export interface RuntimeStateFilesClientOptions {
  readonly apiBaseUrl?: string | URL | null;
  readonly agentToken?: string | null;
  readonly declarationName?: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly getSessionId?: () => string | undefined;
  readonly now?: () => Date;
  readonly suggestedDefaults?: RuntimeStateFilesSuggestedDefaults;
}

export interface RuntimeStateFilesSuggestedDefaults {
  readonly engine?: "zo-blob-r2";
  readonly partition?: "none" | "team" | "user" | "session";
}

export class StateFilesRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StateFilesRuntimeError";
  }
}

/**
 * A `consent_required` gate on a state-files handle request (bead zo-oxg.27.10).
 * The trust binding is `pending_consent`, so the broker won't mint a handle until
 * the consumer grants it. The `message` IS the model-facing steer — eve surfaces
 * a thrown tool-execute error as the `error-text` tool result the model sees
 * (`createToolResultMessagePartFromToolError`), so the model reads it and calls
 * `request_state_consent` with `envelope`; the consumer's Allow grants the binding
 * and the retried write succeeds. Distinct from `StateFilesRuntimeError` (a real
 * failure) so a tool can tell "needs consent" from "broke".
 */
export class StateFilesConsentError extends Error {
  readonly envelope: ConsentEnvelope;

  constructor(envelope: ConsentEnvelope) {
    super(buildConsentSteer(envelope));
    this.name = "StateFilesConsentError";
    this.envelope = envelope;
  }
}

export function createRuntimeStateFilesClient(
  options: RuntimeStateFilesClientOptions = {},
): StateFilesAssetStore {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const getSessionId = options.getSessionId ?? ambientEveSessionId;
  const now = options.now ?? (() => new Date());

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
        ...(eveSessionKey === undefined ? {} : { eveSessionKey }),
      });
      return presignedStateFileGetUrl({
        bucketName: handle.bucketName,
        credentials: handle.credentials,
        endpoint: handle.endpoint,
        expiresInSeconds,
        key: trustedRef.path,
        now: now(),
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
        ...(eveSessionKey === undefined ? {} : { eveSessionKey }),
      });
      const body = await getStateFileObject({
        bucketName: handle.bucketName,
        credentials: handle.credentials,
        endpoint: handle.endpoint,
        fetch: fetchImpl,
        key: trustedRef.path,
        maxBytes: limits.maxBytes,
        now,
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
        ...(eveSessionKey === undefined ? {} : { eveSessionKey }),
      });
      if (handle.access !== "rw") {
        throw new StateFilesRuntimeError(
          `the "${handle.declarationName}" state files handle is read-only, so nothing can be written — the agent's state configuration must allow writes`,
        );
      }
      await putStateFileObject({
        body,
        bucketName: handle.bucketName,
        credentials: handle.credentials,
        endpoint: handle.endpoint,
        fetch: fetchImpl,
        key,
        now,
        ...(writeOptions?.contentType === undefined ? {} : { contentType: writeOptions.contentType }),
      });
      return stateAssetReference({
        type: "state_asset",
        declarationName,
        path: key,
        ...(writeOptions?.contentType === undefined ? {} : { contentType: writeOptions.contentType }),
        bytes: body.byteLength,
      });
    },
  };
}

export function stateAssetReference(input: StateAssetReference): StateAssetReference {
  return Object.freeze({
    type: "state_asset",
    declarationName: input.declarationName,
    path: normalizeStateFilePath(input.path),
    ...(input.contentType === undefined ? {} : { contentType: input.contentType }),
    ...(input.bytes === undefined ? {} : { bytes: input.bytes }),
  });
}

export function normalizeStateFilePath(path: string): string {
  try {
    return normalizeMediaAssetPath(path);
  } catch (error) {
    throw new Error(`state file path is invalid: ${error instanceof Error ? error.message : "invalid path"}`);
  }
}

interface RequestRuntimeStateFilesHandleOptions {
  readonly access: "r" | "rw";
  readonly apiBaseUrl: string;
  readonly agentToken: string;
  readonly declarationName: string;
  readonly eveSessionKey?: string;
  readonly fetch: typeof globalThis.fetch;
  readonly now: () => Date;
  readonly suggestedDefaults: RuntimeStateFilesSuggestedDefaults;
}

async function requestRuntimeStateFilesHandle(
  options: RequestRuntimeStateFilesHandleOptions,
): Promise<StateFilesHandle> {
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
      suggestedDefaults: options.suggestedDefaults,
    }),
  });
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    // A `consent_required` 409 with a parseable envelope becomes a consent steer,
    // not a failure — the trust binding is `pending_consent` and needs the
    // consumer's Allow. An envelope-less consent_required re-throws as a plain
    // runtime error: without the envelope the model has nothing valid to pass.
    if (isConsentRequired(json)) {
      const envelope = parseConsentEnvelope(json);
      if (envelope !== null) throw new StateFilesConsentError(envelope);
    }
    throw new StateFilesRuntimeError(readBrokerErrorMessage(json));
  }
  const handle = parseStateFilesHandle(json);
  if (handle === null) {
    throw new StateFilesRuntimeError(
      "the state files broker returned a malformed handle; retrying may help",
    );
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

function resolveApiBaseUrl(apiBaseUrl: string | URL | null | undefined): string {
  const value = String(apiBaseUrl ?? process.env.ZO_API_URL ?? "").trim();
  if (value.length === 0) {
    throw new StateFilesRuntimeError(
      "the agent deployment is missing ZO_API_URL, so state assets can't be saved — a configuration problem for the user to fix, not something a retry helps",
    );
  }
  return value;
}

function resolveAgentToken(agentToken: string | null | undefined): string {
  const value = (agentToken ?? process.env.ZO_AGENT_TOKEN ?? "").trim();
  if (value.length === 0) {
    throw new StateFilesRuntimeError(
      "the agent deployment is missing ZO_AGENT_TOKEN, so state assets can't be saved — a configuration problem for the user to fix, not something a retry helps",
    );
  }
  return value;
}

function buildStateFilesHandleUrl(apiBaseUrl: string): string {
  const url = new URL(apiBaseUrl);
  url.pathname = `${url.pathname.replace(/\/+$/u, "")}/${STATE_FILES_HANDLE_PATH.replace(/^\/+/, "")}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function parseStateFilesHandle(value: unknown): StateFilesHandle | null {
  if (!isRecord(value)) return null;
  if (value.interface !== "files" || value.engine !== "zo-blob-r2") return null;
  const access = value.access === "r" || value.access === "rw" ? value.access : null;
  const handleId = readString(value, "handleId");
  const declarationName = readString(value, "declarationName");
  const bucketName = readString(value, "bucketName");
  const endpoint = readString(value, "endpoint");
  const credentials = parseStateFilesCredentials(value.credentials);
  if (
    access === null ||
    handleId === null ||
    declarationName === null ||
    bucketName === null ||
    endpoint === null ||
    credentials === null
  ) {
    return null;
  }
  return { handleId, declarationName, interface: "files", access, engine: "zo-blob-r2", bucketName, endpoint, credentials };
}

function parseStateFilesCredentials(value: unknown): StateFilesCredentials | null {
  if (!isRecord(value)) return null;
  const accessKeyId = readString(value, "accessKeyId");
  const secretAccessKey = readString(value, "secretAccessKey");
  const sessionToken = readString(value, "sessionToken");
  const expiresAt = readString(value, "expiresAt");
  if (
    accessKeyId === null ||
    secretAccessKey === null ||
    sessionToken === null ||
    expiresAt === null ||
    !Number.isFinite(Date.parse(expiresAt))
  ) {
    return null;
  }
  return { accessKeyId, secretAccessKey, sessionToken, expiresAt };
}

/** True when a broker error body is the `consent_required` trust gate. */
function isConsentRequired(value: unknown): boolean {
  return isRecord(value) && value.error === "consent_required";
}

function readBrokerErrorMessage(value: unknown): string {
  if (!isRecord(value)) return "state files broker request failed";
  const error = isRecord(value.error) ? value.error : value;
  return readString(error, "message") ?? "state files broker request failed";
}

interface PutStateFileObjectOptions {
  readonly endpoint: string;
  readonly bucketName: string;
  readonly credentials: StateFilesCredentials;
  readonly key: string;
  readonly body: Uint8Array;
  readonly contentType?: string;
  readonly fetch: typeof globalThis.fetch;
  readonly now: () => Date;
}

interface GetStateFileObjectOptions {
  readonly endpoint: string;
  readonly bucketName: string;
  readonly credentials: StateFilesCredentials;
  readonly key: string;
  readonly maxBytes: number;
  readonly fetch: typeof globalThis.fetch;
  readonly now: () => Date;
}

async function getStateFileObject(options: GetStateFileObjectOptions): Promise<Uint8Array> {
  const url = stateFileObjectUrl(options.endpoint, options.bucketName, options.key);
  const headers = await signedS3Headers({
    credentials: options.credentials,
    date: options.now(),
    host: url.host,
    method: "GET",
    path: url.pathname,
    payloadHash: "UNSIGNED-PAYLOAD",
  });
  const response = await options.fetch(url, { method: "GET", headers });
  if (!response.ok) throw new StateFilesRuntimeError(`the storage read was rejected with HTTP ${response.status}`);
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > options.maxBytes) {
    await response.body?.cancel();
    throw new StateFilesRuntimeError(`the state asset exceeds the ${options.maxBytes} byte read limit`);
  }
  if (response.body === null) return new Uint8Array();
  const stream: ReadableStream<Uint8Array> = response.body;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
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

async function putStateFileObject(options: PutStateFileObjectOptions): Promise<void> {
  const url = stateFileObjectUrl(options.endpoint, options.bucketName, options.key);
  const payloadHash = await sha256Hex(options.body);
  const headers = await signedS3Headers({
    credentials: options.credentials,
    date: options.now(),
    host: url.host,
    method: "PUT",
    path: url.pathname,
    payloadHash,
    ...(options.contentType === undefined ? {} : { contentType: options.contentType }),
  });
  const response = await options.fetch(url, {
    method: "PUT",
    headers,
    body: options.body,
  });
  if (!response.ok) {
    throw new StateFilesRuntimeError(
      `the storage write was rejected with HTTP ${response.status}`,
    );
  }
}

function stateFileObjectUrl(endpoint: string, bucketName: string, key: string): URL {
  const base = endpoint.replace(/\/+$/u, "");
  return new URL(`${base}/${encodeS3PathSegment(bucketName)}/${encodeS3Key(key)}`);
}

interface PresignedStateFileGetUrlOptions {
  readonly endpoint: string;
  readonly bucketName: string;
  readonly credentials: StateFilesCredentials;
  readonly key: string;
  readonly expiresInSeconds: number;
  readonly now: Date;
}

async function presignedStateFileGetUrl(options: PresignedStateFileGetUrlOptions): Promise<URL> {
  const credentialSeconds = Math.floor(
    (Date.parse(options.credentials.expiresAt) - options.now.getTime()) / 1000,
  );
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
    "X-Amz-SignedHeaders": "host",
  });
  const canonicalQuery = [...query.entries()]
    .map(([name, value]) => `${encodeS3PathSegment(name)}=${encodeS3PathSegment(value)}`)
    .sort()
    .join("&");
  const canonicalRequest = [
    "GET",
    url.pathname,
    canonicalQuery,
    `host:${url.host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join("\n");
  const signingKey = await awsSigningKey(options.credentials.secretAccessKey, dateStamp);
  query.set("X-Amz-Signature", await hmacHex(signingKey, stringToSign));
  url.search = [...query.entries()]
    .map(([name, value]) => `${encodeS3PathSegment(name)}=${encodeS3PathSegment(value)}`)
    .sort()
    .join("&");
  return url;
}

interface SignedS3HeadersInput {
  readonly method: "GET" | "PUT";
  readonly path: string;
  readonly host: string;
  readonly payloadHash: string;
  readonly credentials: StateFilesCredentials;
  readonly date: Date;
  readonly contentType?: string;
}

async function signedS3Headers(input: SignedS3HeadersInput): Promise<Headers> {
  const amzDate = awsAmzDate(input.date);
  const dateStamp = amzDate.slice(0, 8);
  const headerEntries: [string, string][] = [
    ["host", input.host],
    ["x-amz-content-sha256", input.payloadHash],
    ["x-amz-date", amzDate],
    ["x-amz-security-token", input.credentials.sessionToken],
  ];
  if (input.contentType !== undefined) {
    headerEntries.push(["content-type", input.contentType]);
  }
  headerEntries.sort(([left], [right]) => left.localeCompare(right));
  const canonicalHeaders = headerEntries.map(([name, value]) => `${name}:${value.trim()}\n`).join("");
  const signedHeaders = headerEntries.map(([name]) => name).join(";");
  const canonicalRequest = [
    input.method,
    input.path,
    "",
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join("\n");
  const signingKey = await awsSigningKey(input.credentials.secretAccessKey, dateStamp);
  const signature = await hmacHex(signingKey, stringToSign);
  const headers = new Headers();
  for (const [name, value] of headerEntries) headers.set(name, value);
  headers.set(
    "authorization",
    `AWS4-HMAC-SHA256 Credential=${input.credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  );
  return headers;
}

async function awsSigningKey(secretAccessKey: string, dateStamp: string): Promise<Uint8Array> {
  const dateKey = await hmacBytes(new TextEncoder().encode(`AWS4${secretAccessKey}`), dateStamp);
  const regionKey = await hmacBytes(dateKey, "auto");
  const serviceKey = await hmacBytes(regionKey, "s3");
  return hmacBytes(serviceKey, "aws4_request");
}

async function hmacBytes(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data)));
}

async function hmacHex(key: Uint8Array, data: string): Promise<string> {
  return bytesToHex(await hmacBytes(key, data));
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function awsAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/gu, "");
}

function encodeS3Key(key: string): string {
  return key.split("/").map(encodeS3PathSegment).join("/");
}

function encodeS3PathSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/[!'()*]/gu, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
