/** Runtime client contract for the external-state `files` interface. */

import { parseConsentEnvelope, type StateConsentEnvelope } from "./state-consent-envelope";

/** Access mode requested for a state-files binding: read-only or read-write. */
export type StateFilesAccess = "r" | "rw";

/** The external-state interface type for object-store file access. */
export type StateFilesInterface = "files";

/** Cloud object-store engine backed by Cloudflare R2. */
export type StateFilesEngine = "zo-blob-r2";

/** How file-store instances subdivide. Drives the bucket-key prefix scoping. */
export type StateFilesPartition = "none" | "team" | "user" | "session";

/** Runtime broker route path for requesting a state-files handle. */
export const STATE_FILES_HANDLE_PATH = "/state/handles";

/** Header name carrying the agent bearer token to the runtime broker. */
export const ZO_AGENT_TOKEN_HEADER = "x-zo-agent-token";

/** Header name carrying the eve session key to the runtime broker. */
export const ZO_EVE_SESSION_HEADER = "x-zo-eve-session";

/** Temporary S3-compatible credentials for direct object-store access. Never log the secrets. */
export interface StateFilesCredentials {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly sessionToken: string;
  readonly expiresAt: string;
}

/**
 * Bearer-secret handle for direct object-store access.
 *
 * `handleId`, `storeId`, `stateInstanceId`, `bucketName`, and `partition` are safe to log for
 * debugging. Never log the full object: `credentials.secretAccessKey` and
 * `credentials.sessionToken` grant temporary bucket access.
 */
export interface StateFilesHandle {
  readonly handleId: string;
  readonly declarationName: string;
  readonly interface: StateFilesInterface;
  readonly access: StateFilesAccess;
  readonly engine: StateFilesEngine;
  readonly storeId: string;
  readonly stateInstanceId: string;
  readonly partition: StateFilesPartition;
  readonly bucketName: string;
  readonly endpoint: string;
  readonly credentials: StateFilesCredentials;
}

/** Request body sent to the runtime broker to obtain a state-files handle. */
export interface StateFilesHandleRequest {
  readonly declarationName: string;
  readonly interface: StateFilesInterface;
  readonly access: StateFilesAccess;
}

/** Fetch-compatible function for issuing HTTP requests. Accepts the standard `fetch` signature. */
export interface StateFilesHandleFetch {
  (input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

/** Union of accepted header-initialization shapes: Headers instance, array of pairs, or record. */
export type StateFilesHeadersInit =
  | Headers
  | ReadonlyArray<readonly [string, string]>
  | Readonly<Record<string, string>>;

/** Options for requesting a state-files handle from the runtime broker. */
export interface RequestStateFilesHandleOptions {
  readonly fetch: StateFilesHandleFetch;
  readonly apiBaseUrl: string | URL;
  readonly declarationName: string;
  readonly access: StateFilesAccess;
  /** Agent bearer token sent to the runtime broker as `x-zo-agent-token`. */
  readonly agentToken?: string;
  /** eve session key sent as `x-zo-eve-session`; the route derives resolver session identity from auth context. */
  readonly eveSessionKey?: string;
  /** Extra headers; cannot override the SDK-managed content type or Zo auth headers. */
  readonly headers?: StateFilesHeadersInit;
}

/** Error thrown when requesting a state-files handle fails. Carries the HTTP status and broker error code. */
export class StateFilesHandleError extends Error {
  readonly status: number;
  readonly code: string | null;
  /**
   * The consent envelope, present ONLY on a `consent_required` 409 whose body
   * carried the full contract (bindingId, declarationName, resourceName, party).
   * The `@zo/state` consent wrapper reads this to steer the model into a
   * `request_state_consent` call; `null` for every other failure (and for a
   * malformed consent body).
   */
  readonly consent: StateConsentEnvelope | null;

  constructor(
    message: string,
    options: { status: number; code?: string | null; consent?: StateConsentEnvelope | null },
  ) {
    super(message);
    this.name = "StateFilesHandleError";
    this.status = options.status;
    this.code = options.code ?? null;
    this.consent = options.consent ?? null;
  }
}

/**
 * Requests a state-files handle from the runtime broker.
 * Throws `StateFilesHandleError` on failure or malformed response.
 */
export async function requestStateFilesHandle(
  options: RequestStateFilesHandleOptions,
): Promise<StateFilesHandle> {
  const response = await options.fetch(buildStateFilesHandleUrl(options.apiBaseUrl), {
    method: "POST",
    headers: buildStateFilesHandleHeaders(options),
    body: JSON.stringify(buildStateFilesHandleRequest(options)),
  });
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = parseStateFilesBrokerError(json);
    throw new StateFilesHandleError(error.message, {
      status: response.status,
      code: error.code,
      // A `consent_required` 409 carries the consent envelope inline; anything
      // else (or a malformed body) leaves it null.
      consent: error.code === "consent_required" ? parseConsentEnvelope(json) : null,
    });
  }
  const handle = parseStateFilesHandle(json);
  if (handle === null) {
    throw new StateFilesHandleError("state files broker returned a malformed handle", {
      status: response.status,
      code: "malformed_handle",
    });
  }
  return handle;
}

/** Parses a runtime-broker response into a `StateFilesHandle`, or `null` if malformed. */
export function parseStateFilesHandle(value: unknown): StateFilesHandle | null {
  if (!isRecord(value)) {
    return null;
  }
  const credentials = parseStateFilesCredentials(value.credentials);
  if (credentials === null) {
    return null;
  }
  const access = parseStateFilesAccess(value.access);
  if (access === null) {
    return null;
  }
  if (value.interface !== "files" || value.engine !== "zo-blob-r2") {
    return null;
  }
  const handleId = readString(value, "handleId");
  const declarationName = readString(value, "declarationName");
  const storeId = readString(value, "storeId");
  const stateInstanceId = readString(value, "stateInstanceId");
  const partition = parseStateFilesPartition(value.partition);
  const bucketName = readString(value, "bucketName");
  const endpoint = readString(value, "endpoint");
  if (
    handleId === null ||
    declarationName === null ||
    storeId === null ||
    stateInstanceId === null ||
    partition === null ||
    bucketName === null ||
    endpoint === null
  ) {
    return null;
  }
  return Object.freeze({
    handleId,
    declarationName,
    interface: "files",
    access,
    engine: "zo-blob-r2",
    storeId,
    stateInstanceId,
    partition,
    bucketName,
    endpoint,
    credentials,
  });
}

/** Metadata for a single object in the state-files store. */
export interface StateFilesObject {
  readonly key: string;
  readonly size?: number;
  readonly etag?: string;
  readonly lastModified?: Date;
}

/** Accepted body types for writing to the state-files store. */
export type StateFilesBody = string | Uint8Array | ArrayBuffer | Blob;

/** S3-client input for listing objects in a state-files bucket. */
export interface StateFilesS3ListInput {
  readonly endpoint: string;
  readonly bucketName: string;
  readonly credentials: StateFilesCredentials;
  readonly prefix?: string;
}

/** S3-client input for reading an object from a state-files bucket. */
export interface StateFilesS3ReadInput {
  readonly endpoint: string;
  readonly bucketName: string;
  readonly credentials: StateFilesCredentials;
  readonly key: string;
}

/** S3-client input for writing an object to a state-files bucket. */
export interface StateFilesS3WriteInput {
  readonly endpoint: string;
  readonly bucketName: string;
  readonly credentials: StateFilesCredentials;
  readonly key: string;
  readonly body: StateFilesBody;
  readonly contentType?: string;
}

/** S3-client input for deleting an object from a state-files bucket. */
export interface StateFilesS3DeleteInput {
  readonly endpoint: string;
  readonly bucketName: string;
  readonly credentials: StateFilesCredentials;
  readonly key: string;
}

/** S3-compatible client interface for low-level state-files bucket operations. */
export interface StateFilesS3Client {
  /** Lists objects in the bucket, optionally filtered by prefix. */
  listObjects(input: StateFilesS3ListInput): Promise<readonly StateFilesObject[]>;
  /** Reads an object's body as bytes. */
  readObject(input: StateFilesS3ReadInput): Promise<Uint8Array>;
  /** Writes an object to the bucket. */
  writeObject(input: StateFilesS3WriteInput): Promise<void>;
  /** Deletes an object from the bucket. */
  deleteObject(input: StateFilesS3DeleteInput): Promise<void>;
}

/** Optional settings for writing a file to the state-files store. */
export interface StateFilesWriteOptions {
  readonly contentType?: string;
}

/** High-level client for state-files operations. Paths are relative; handles are managed internally. */
export interface StateFilesClient {
  /** Lists files under the optional prefix. Returns metadata for each match. */
  list(prefix?: string): Promise<readonly StateFilesObject[]>;
  /** Reads a file's body as bytes. */
  read(path: string): Promise<Uint8Array>;
  /** Writes a file. Requires a handle with `rw` access. */
  write(path: string, body: StateFilesBody, options?: StateFilesWriteOptions): Promise<void>;
  /** Deletes a file. Requires a handle with `rw` access. */
  delete(path: string): Promise<void>;
}

/** Options for creating a state-files client with a static handle. */
export interface CreateStateFilesClientOptions {
  readonly handle: StateFilesHandle;
  readonly s3: StateFilesS3Client;
}

/**
 * Creates a state-files client backed by a single static handle.
 * For credentials that expire, use `createRefreshingStateFilesClient` instead.
 */
export function createStateFilesClient(options: CreateStateFilesClientOptions): StateFilesClient {
  return createStateFilesClientFromHandleSource({
    getHandle: async () => options.handle,
    s3: options.s3,
  });
}

/** Options for creating a state-files client that auto-refreshes expiring handles. */
export interface CreateRefreshingStateFilesClientOptions {
  /** Loads a fresh handle when the current one is near expiration. */
  readonly loadHandle: () => Promise<StateFilesHandle>;
  readonly s3: StateFilesS3Client;
  /** Returns the current time. Defaults to `() => new Date()`. Inject for testing. */
  readonly now?: () => Date;
  /** Reload when the handle expires within this window. Defaults to 60 seconds. */
  readonly refreshWindowMs?: number;
}

/**
 * Creates a state-files client that reloads the handle when it nears expiration.
 * Checks before each operation; if the handle expires within `refreshWindowMs`, calls `loadHandle`.
 */
export function createRefreshingStateFilesClient(
  options: CreateRefreshingStateFilesClientOptions,
): StateFilesClient {
  let cached: StateFilesHandle | null = null;
  const now = options.now ?? (() => new Date());
  const refreshWindowMs = options.refreshWindowMs ?? 60_000;
  return createStateFilesClientFromHandleSource({
    getHandle: async () => {
      if (cached === null || shouldRefreshStateFilesHandle(cached, now(), refreshWindowMs)) {
        cached = await options.loadHandle();
      }
      return cached;
    },
    s3: options.s3,
  });
}

/**
 * Determines whether a state-files handle needs refreshing based on its expiration.
 * Returns `true` if the handle expires within `refreshWindowMs` or if `expiresAt` is malformed.
 */
export function shouldRefreshStateFilesHandle(
  handle: StateFilesHandle,
  now: Date,
  refreshWindowMs = 60_000,
): boolean {
  const expiresAtMs = Date.parse(handle.credentials.expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    return true;
  }
  return expiresAtMs - now.getTime() <= refreshWindowMs;
}

function createStateFilesClientFromHandleSource(options: {
  readonly getHandle: () => Promise<StateFilesHandle>;
  readonly s3: StateFilesS3Client;
}): StateFilesClient {
  return {
    async list(prefix?: string) {
      const handle = await options.getHandle();
      const normalizedPrefix = normalizeStateFilePrefix(prefix);
      return options.s3.listObjects({
        ...buildS3Context(handle),
        ...(normalizedPrefix === undefined ? {} : { prefix: normalizedPrefix }),
      });
    },
    async read(path: string) {
      const handle = await options.getHandle();
      return options.s3.readObject({
        ...buildS3Context(handle),
        key: normalizeStateFilePath(path),
      });
    },
    async write(path: string, body: StateFilesBody, writeOptions?: StateFilesWriteOptions) {
      const handle = await options.getHandle();
      assertStateFilesWriteAccess(handle);
      return options.s3.writeObject({
        ...buildS3Context(handle),
        key: normalizeStateFilePath(path),
        body,
        ...(writeOptions?.contentType === undefined
          ? {}
          : { contentType: writeOptions.contentType }),
      });
    },
    async delete(path: string) {
      const handle = await options.getHandle();
      assertStateFilesWriteAccess(handle);
      return options.s3.deleteObject({
        ...buildS3Context(handle),
        key: normalizeStateFilePath(path),
      });
    },
  };
}

/**
 * Validates and normalizes a state-file path for S3 operations.
 * Throws if the path is empty, absolute, or contains invalid segments (`.`, `..`, or empty).
 */
export function normalizeStateFilePath(path: string): string {
  if (path.length === 0) {
    throw new Error("state file path must not be empty");
  }
  if (path.startsWith("/")) {
    throw new Error(`state file path "${path}" must be relative`);
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new Error(`state file path "${path}" must not contain empty, . or .. segments`);
  }
  return path;
}

/**
 * Validates and normalizes a state-file prefix for list operations.
 * Returns `undefined` for empty/undefined input; ensures trailing slash for directory-style prefixes.
 */
export function normalizeStateFilePrefix(prefix: string | undefined): string | undefined {
  if (prefix === undefined || prefix.length === 0) {
    return undefined;
  }
  if (prefix.endsWith("/")) {
    return normalizeStateFilePath(prefix.slice(0, -1)) + "/";
  }
  return normalizeStateFilePath(prefix);
}

function buildStateFilesHandleRequest(
  options: RequestStateFilesHandleOptions,
): StateFilesHandleRequest {
  const request: StateFilesHandleRequest = {
    declarationName: options.declarationName,
    interface: "files",
    access: options.access,
  };
  return request;
}

function buildStateFilesHandleUrl(apiBaseUrl: string | URL): string {
  const url = new URL(String(apiBaseUrl));
  url.pathname = joinUrlPath(url.pathname, STATE_FILES_HANDLE_PATH);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function joinUrlPath(basePath: string, childPath: string): string {
  const base = basePath.replace(/\/+$/, "");
  const child = childPath.replace(/^\/+/, "");
  return `${base}/${child}`;
}

function buildStateFilesHandleHeaders(options: RequestStateFilesHandleOptions): Headers {
  const headers = createHeaders(options.headers);
  headers.set("content-type", "application/json");
  if (options.agentToken !== undefined) {
    headers.set(ZO_AGENT_TOKEN_HEADER, options.agentToken);
  }
  if (options.eveSessionKey !== undefined) {
    headers.set(ZO_EVE_SESSION_HEADER, options.eveSessionKey);
  }
  return headers;
}

// A scoped guard instead of a bare `Array.isArray(init)`: consumers that load
// ts-reset (e.g. apps/api compiling this source through the workspace exports
// map) get its `isArray(value): value is unknown[]` override, under which the
// readonly entry array doesn't survive narrowing and the loop element degrades
// to `unknown` (TS2488). Within the union, only the entry array is an array.
function isHeaderEntryArray(
  value: StateFilesHeadersInit,
): value is ReadonlyArray<readonly [string, string]> {
  return Array.isArray(value);
}

function createHeaders(init: StateFilesHeadersInit | undefined): Headers {
  const headers = new Headers();
  if (init === undefined) {
    return headers;
  }
  if (init instanceof Headers) {
    init.forEach((value, key) => headers.set(key, value));
    return headers;
  }
  if (isHeaderEntryArray(init)) {
    for (const [key, value] of init) {
      headers.set(key, value);
    }
    return headers;
  }
  for (const [key, value] of Object.entries(init)) {
    headers.set(key, value);
  }
  return headers;
}

function parseStateFilesBrokerError(value: unknown): { message: string; code: string | null } {
  if (!isRecord(value)) {
    return { message: "state files broker request failed", code: null };
  }
  const routeError = readString(value, "error");
  if (routeError !== null) {
    return {
      message: readString(value, "message") ?? "state files broker request failed",
      code: routeError,
    };
  }
  const error = isRecord(value.error) ? value.error : value;
  const message = readString(error, "message") ?? "state files broker request failed";
  const code = readString(error, "code") ?? readString(error, "error");
  return { message, code };
}

function parseStateFilesCredentials(value: unknown): StateFilesCredentials | null {
  if (!isRecord(value)) {
    return null;
  }
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
  return Object.freeze({ accessKeyId, secretAccessKey, sessionToken, expiresAt });
}

function parseStateFilesPartition(value: unknown): StateFilesPartition | null {
  if (value === "none" || value === "team" || value === "user" || value === "session") {
    return value;
  }
  return null;
}

function parseStateFilesAccess(value: unknown): StateFilesAccess | null {
  if (value === "r" || value === "rw") {
    return value;
  }
  return null;
}

function buildS3Context(handle: StateFilesHandle): Pick<
  StateFilesS3ListInput,
  "endpoint" | "bucketName" | "credentials"
> {
  return {
    endpoint: handle.endpoint,
    bucketName: handle.bucketName,
    credentials: handle.credentials,
  };
}

function assertStateFilesWriteAccess(handle: StateFilesHandle): void {
  if (handle.access !== "rw") {
    throw new Error(`state files handle "${handle.handleId}" is read-only`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
