// ../../../../../tmp/agent-sdk-mirror-pJef74/repo/src/state-consent-envelope.ts
import { z } from "zod";
var consentPartySchema = z.object({
  handle: z.string().min(1),
  external: z.boolean(),
  intentDivergenceNote: z.string().min(1).optional()
});
var requestStateConsentInputSchema = z.object({
  bindingId: z.string().min(1),
  declarationName: z.string().min(1),
  resourceName: z.string().min(1),
  party: consentPartySchema
});
function parseConsentEnvelope(value) {
  const result = requestStateConsentInputSchema.safeParse(value);
  return result.success ? result.data : null;
}

// ../../../../../tmp/agent-sdk-mirror-pJef74/repo/src/state-files.ts
var STATE_FILES_HANDLE_PATH = "/state/handles";
var ZO_AGENT_TOKEN_HEADER = "x-zo-agent-token";
var ZO_EVE_SESSION_HEADER = "x-zo-eve-session";

class StateFilesHandleError extends Error {
  status;
  code;
  consent;
  constructor(message, options) {
    super(message);
    this.name = "StateFilesHandleError";
    this.status = options.status;
    this.code = options.code ?? null;
    this.consent = options.consent ?? null;
  }
}
async function requestStateFilesHandle(options) {
  const response = await options.fetch(buildStateFilesHandleUrl(options.apiBaseUrl), {
    method: "POST",
    headers: buildStateFilesHandleHeaders(options),
    body: JSON.stringify(buildStateFilesHandleRequest(options))
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const error = parseStateFilesBrokerError(json);
    throw new StateFilesHandleError(error.message, {
      status: response.status,
      code: error.code,
      consent: error.code === "consent_required" ? parseConsentEnvelope(json) : null
    });
  }
  const handle = parseStateFilesHandle(json);
  if (handle === null) {
    throw new StateFilesHandleError("state files broker returned a malformed handle", {
      status: response.status,
      code: "malformed_handle"
    });
  }
  return handle;
}
function parseStateFilesHandle(value) {
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
  if (handleId === null || declarationName === null || storeId === null || stateInstanceId === null || partition === null || bucketName === null || endpoint === null) {
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
    credentials
  });
}
function createStateFilesClient(options) {
  return createStateFilesClientFromHandleSource({
    getHandle: async () => options.handle,
    s3: options.s3
  });
}
function createRefreshingStateFilesClient(options) {
  let cached = null;
  const now = options.now ?? (() => new Date);
  const refreshWindowMs = options.refreshWindowMs ?? 60000;
  return createStateFilesClientFromHandleSource({
    getHandle: async () => {
      if (cached === null || shouldRefreshStateFilesHandle(cached, now(), refreshWindowMs)) {
        cached = await options.loadHandle();
      }
      return cached;
    },
    s3: options.s3
  });
}
function shouldRefreshStateFilesHandle(handle, now, refreshWindowMs = 60000) {
  const expiresAtMs = Date.parse(handle.credentials.expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    return true;
  }
  return expiresAtMs - now.getTime() <= refreshWindowMs;
}
function createStateFilesClientFromHandleSource(options) {
  return {
    async list(prefix) {
      const handle = await options.getHandle();
      const normalizedPrefix = normalizeStateFilePrefix(prefix);
      return options.s3.listObjects({
        ...buildS3Context(handle),
        ...normalizedPrefix === undefined ? {} : { prefix: normalizedPrefix }
      });
    },
    async read(path) {
      const handle = await options.getHandle();
      return options.s3.readObject({
        ...buildS3Context(handle),
        key: normalizeStateFilePath(path)
      });
    },
    async write(path, body, writeOptions) {
      const handle = await options.getHandle();
      assertStateFilesWriteAccess(handle);
      return options.s3.writeObject({
        ...buildS3Context(handle),
        key: normalizeStateFilePath(path),
        body,
        ...writeOptions?.contentType === undefined ? {} : { contentType: writeOptions.contentType }
      });
    },
    async delete(path) {
      const handle = await options.getHandle();
      assertStateFilesWriteAccess(handle);
      return options.s3.deleteObject({
        ...buildS3Context(handle),
        key: normalizeStateFilePath(path)
      });
    }
  };
}
function normalizeStateFilePath(path) {
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
function normalizeStateFilePrefix(prefix) {
  if (prefix === undefined || prefix.length === 0) {
    return;
  }
  if (prefix.endsWith("/")) {
    return normalizeStateFilePath(prefix.slice(0, -1)) + "/";
  }
  return normalizeStateFilePath(prefix);
}
function buildStateFilesHandleRequest(options) {
  const request = {
    declarationName: options.declarationName,
    interface: "files",
    access: options.access
  };
  return request;
}
function buildStateFilesHandleUrl(apiBaseUrl) {
  const url = new URL(String(apiBaseUrl));
  url.pathname = joinUrlPath(url.pathname, STATE_FILES_HANDLE_PATH);
  url.search = "";
  url.hash = "";
  return url.toString();
}
function joinUrlPath(basePath, childPath) {
  const base = basePath.replace(/\/+$/, "");
  const child = childPath.replace(/^\/+/, "");
  return `${base}/${child}`;
}
function buildStateFilesHandleHeaders(options) {
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
function isHeaderEntryArray(value) {
  return Array.isArray(value);
}
function createHeaders(init) {
  const headers = new Headers;
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
function parseStateFilesBrokerError(value) {
  if (!isRecord(value)) {
    return { message: "state files broker request failed", code: null };
  }
  const routeError = readString(value, "error");
  if (routeError !== null) {
    return {
      message: readString(value, "message") ?? "state files broker request failed",
      code: routeError
    };
  }
  const error = isRecord(value.error) ? value.error : value;
  const message = readString(error, "message") ?? "state files broker request failed";
  const code = readString(error, "code") ?? readString(error, "error");
  return { message, code };
}
function parseStateFilesCredentials(value) {
  if (!isRecord(value)) {
    return null;
  }
  const accessKeyId = readString(value, "accessKeyId");
  const secretAccessKey = readString(value, "secretAccessKey");
  const sessionToken = readString(value, "sessionToken");
  const expiresAt = readString(value, "expiresAt");
  if (accessKeyId === null || secretAccessKey === null || sessionToken === null || expiresAt === null || !Number.isFinite(Date.parse(expiresAt))) {
    return null;
  }
  return Object.freeze({ accessKeyId, secretAccessKey, sessionToken, expiresAt });
}
function parseStateFilesPartition(value) {
  if (value === "none" || value === "team" || value === "user" || value === "session") {
    return value;
  }
  return null;
}
function parseStateFilesAccess(value) {
  if (value === "r" || value === "rw") {
    return value;
  }
  return null;
}
function buildS3Context(handle) {
  return {
    endpoint: handle.endpoint,
    bucketName: handle.bucketName,
    credentials: handle.credentials
  };
}
function assertStateFilesWriteAccess(handle) {
  if (handle.access !== "rw") {
    throw new Error(`state files handle "${handle.handleId}" is read-only`);
  }
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
export {
  shouldRefreshStateFilesHandle,
  requestStateFilesHandle,
  parseStateFilesHandle,
  normalizeStateFilePrefix,
  normalizeStateFilePath,
  createStateFilesClient,
  createRefreshingStateFilesClient,
  ZO_EVE_SESSION_HEADER,
  ZO_AGENT_TOKEN_HEADER,
  StateFilesHandleError,
  STATE_FILES_HANDLE_PATH
};
