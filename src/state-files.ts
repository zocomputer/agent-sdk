/** Runtime client contract for the external-state `files` interface. */

export type StateFilesAccess = "r" | "rw";
export type StateFilesInterface = "files";
export type StateFilesEngine = "zo-blob-r2";
export type StateFilesPartition = "none" | "team" | "user" | "session";

export const STATE_FILES_HANDLE_PATH = "/state/handles";
export const ZO_AGENT_TOKEN_HEADER = "x-zo-agent-token";
export const ZO_EVE_SESSION_HEADER = "x-zo-eve-session";

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

export interface StateFilesHandleRequest {
  readonly declarationName: string;
  readonly interface: StateFilesInterface;
  readonly access: StateFilesAccess;
}

export interface StateFilesHandleFetch {
  (input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

export type StateFilesHeadersInit =
  | Headers
  | ReadonlyArray<readonly [string, string]>
  | Readonly<Record<string, string>>;

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

export class StateFilesHandleError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, options: { status: number; code?: string | null }) {
    super(message);
    this.name = "StateFilesHandleError";
    this.status = options.status;
    this.code = options.code ?? null;
  }
}

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

export interface StateFilesObject {
  readonly key: string;
  readonly size?: number;
  readonly etag?: string;
  readonly lastModified?: Date;
}

export type StateFilesBody = string | Uint8Array | ArrayBuffer | Blob;

export interface StateFilesS3ListInput {
  readonly endpoint: string;
  readonly bucketName: string;
  readonly credentials: StateFilesCredentials;
  readonly prefix?: string;
}

export interface StateFilesS3ReadInput {
  readonly endpoint: string;
  readonly bucketName: string;
  readonly credentials: StateFilesCredentials;
  readonly key: string;
}

export interface StateFilesS3WriteInput {
  readonly endpoint: string;
  readonly bucketName: string;
  readonly credentials: StateFilesCredentials;
  readonly key: string;
  readonly body: StateFilesBody;
  readonly contentType?: string;
}

export interface StateFilesS3DeleteInput {
  readonly endpoint: string;
  readonly bucketName: string;
  readonly credentials: StateFilesCredentials;
  readonly key: string;
}

export interface StateFilesS3Client {
  listObjects(input: StateFilesS3ListInput): Promise<readonly StateFilesObject[]>;
  readObject(input: StateFilesS3ReadInput): Promise<Uint8Array>;
  writeObject(input: StateFilesS3WriteInput): Promise<void>;
  deleteObject(input: StateFilesS3DeleteInput): Promise<void>;
}

export interface StateFilesWriteOptions {
  readonly contentType?: string;
}

export interface StateFilesClient {
  list(prefix?: string): Promise<readonly StateFilesObject[]>;
  read(path: string): Promise<Uint8Array>;
  write(path: string, body: StateFilesBody, options?: StateFilesWriteOptions): Promise<void>;
  delete(path: string): Promise<void>;
}

export interface CreateStateFilesClientOptions {
  readonly handle: StateFilesHandle;
  readonly s3: StateFilesS3Client;
}

export function createStateFilesClient(options: CreateStateFilesClientOptions): StateFilesClient {
  return createStateFilesClientFromHandleSource({
    getHandle: async () => options.handle,
    s3: options.s3,
  });
}

export interface CreateRefreshingStateFilesClientOptions {
  readonly loadHandle: () => Promise<StateFilesHandle>;
  readonly s3: StateFilesS3Client;
  readonly now?: () => Date;
  /** Reload when the handle expires within this window. Defaults to 60 seconds. */
  readonly refreshWindowMs?: number;
}

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

function createHeaders(init: StateFilesHeadersInit | undefined): Headers {
  const headers = new Headers();
  if (init === undefined) {
    return headers;
  }
  if (init instanceof Headers) {
    init.forEach((value, key) => headers.set(key, value));
    return headers;
  }
  if (Array.isArray(init)) {
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
