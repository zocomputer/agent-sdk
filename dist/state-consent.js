// ../../../../../tmp/agent-sdk-mirror-7NEIYN/repo/src/state-consent-tool.ts
import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";

// ../../../../../tmp/agent-sdk-mirror-7NEIYN/repo/src/state-consent-envelope.ts
import { z } from "zod";
var REQUEST_STATE_CONSENT_TOOL_NAME = "request_state_consent";
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

// ../../../../../tmp/agent-sdk-mirror-7NEIYN/repo/src/state-consent-tool.ts
function createRequestStateConsentTool() {
  return defineTool({
    description: "Request the consumer's consent before using an external-state capability that " + "resolved `consent_required`. Call this with the exact envelope the state error " + "returned (bindingId, declarationName, resourceName, party). The consumer is asked " + "to Allow or Deny; on Allow the capability is granted and you should retry the " + "original state operation. Do not fabricate the envelope — use the one the state " + "tool gave you.",
    inputSchema: requestStateConsentInputSchema,
    execute: (input) => {
      return `Consent granted for "${input.declarationName}". The capability is now active — ` + `retry your original state operation and it will succeed.`;
    },
    approval: always()
  });
}
// ../../../../../tmp/agent-sdk-mirror-7NEIYN/repo/src/state-files.ts
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
function createHeaders(init) {
  const headers = new Headers;
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
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

// ../../../../../tmp/agent-sdk-mirror-7NEIYN/repo/src/state-sandbox.ts
var STATE_SANDBOX_HANDLE_PATH = "/state/handles";
var ZO_AGENT_TOKEN_HEADER2 = "x-zo-agent-token";
var ZO_EVE_SESSION_HEADER2 = "x-zo-eve-session";

class StateSandboxHandleError extends Error {
  status;
  code;
  consent;
  constructor(message, options) {
    super(message);
    this.name = "StateSandboxHandleError";
    this.status = options.status;
    this.code = options.code ?? null;
    this.consent = options.consent ?? null;
  }
}
async function requestStateSandboxHandle(options) {
  const response = await options.fetch(buildStateSandboxHandleUrl(options.apiBaseUrl), {
    method: "POST",
    headers: buildStateSandboxHandleHeaders(options),
    body: JSON.stringify(buildStateSandboxHandleRequest(options))
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const error = parseStateSandboxBrokerError(json);
    throw new StateSandboxHandleError(error.message, {
      status: response.status,
      code: error.code,
      consent: error.code === "consent_required" ? parseConsentEnvelope(json) : null
    });
  }
  const handle = parseStateSandboxHandle(json);
  if (handle === null) {
    throw new StateSandboxHandleError("state sandbox broker returned a malformed handle", {
      status: response.status,
      code: "malformed_handle"
    });
  }
  return handle;
}
function parseStateSandboxHandle(value) {
  if (!isRecord2(value)) {
    return null;
  }
  const access = parseStateSandboxAccess(value.access);
  const iface = parseStateSandboxInterface(value.interface);
  const partition = parseStateSandboxPartition(value.partition);
  const lifecycle = parseStateSandboxLifecycle(value.lifecycle ?? value.status);
  const sandbox = parseStateSandboxSshAccess(value.sandbox ?? value.ssh ?? value.accessHandle ?? value.sshAccess);
  if (access === null || iface === null || partition === null || lifecycle === null || sandbox === null || value.engine !== "sandbox-daytona") {
    return null;
  }
  const handleId = readString2(value, "handleId");
  const declarationName = readString2(value, "declarationName");
  const storeId = readString2(value, "storeId");
  const stateInstanceId = readString2(value, "stateInstanceId");
  const sandboxResourceId = readString2(value, "sandboxResourceId");
  const rootPath = readString2(value, "rootPath");
  if (handleId === null || declarationName === null || storeId === null || stateInstanceId === null || sandboxResourceId === null || rootPath === null || !rootPath.startsWith("/")) {
    return null;
  }
  return Object.freeze({
    handleId,
    declarationName,
    interface: iface,
    access,
    engine: "sandbox-daytona",
    storeId,
    stateInstanceId,
    partition,
    sandboxResourceId,
    rootPath,
    lifecycle,
    sandbox
  });
}
function buildStateSandboxHandleRequest(options) {
  return {
    declarationName: options.declarationName,
    interface: options.interface,
    access: options.access,
    suggestedDefaults: {
      ...options.suggestedDefaults,
      engine: options.suggestedDefaults?.engine ?? "sandbox-daytona"
    }
  };
}
function buildStateSandboxHandleUrl(apiBaseUrl) {
  const url = new URL(String(apiBaseUrl));
  url.pathname = joinUrlPath2(url.pathname, STATE_SANDBOX_HANDLE_PATH);
  url.search = "";
  url.hash = "";
  return url.toString();
}
function joinUrlPath2(basePath, childPath) {
  const base = basePath.replace(/\/+$/, "");
  const child = childPath.replace(/^\/+/, "");
  return `${base}/${child}`;
}
function buildStateSandboxHandleHeaders(options) {
  const headers = createHeaders2(options.headers);
  headers.set("content-type", "application/json");
  if (options.agentToken !== undefined) {
    headers.set(ZO_AGENT_TOKEN_HEADER2, options.agentToken);
  }
  if (options.eveSessionKey !== undefined) {
    headers.set(ZO_EVE_SESSION_HEADER2, options.eveSessionKey);
  }
  return headers;
}
function createHeaders2(init) {
  const headers = new Headers;
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
function parseStateSandboxBrokerError(value) {
  if (!isRecord2(value)) {
    return { message: "state sandbox broker request failed", code: null };
  }
  const routeError = readString2(value, "error");
  if (routeError !== null) {
    return {
      message: readString2(value, "message") ?? "state sandbox broker request failed",
      code: routeError
    };
  }
  const error = isRecord2(value.error) ? value.error : value;
  const message = readString2(error, "message") ?? "state sandbox broker request failed";
  const code = readString2(error, "code") ?? readString2(error, "error");
  return { message, code };
}
function parseStateSandboxSshAccess(value) {
  if (!isRecord2(value)) {
    return null;
  }
  const sandboxId = readString2(value, "sandboxId");
  const sshHost = readString2(value, "sshHost");
  const sshUser = readString2(value, "sshUser");
  const expiresAt = readString2(value, "expiresAt");
  if (sandboxId === null || sshHost === null || sshUser === null || expiresAt === null || !Number.isFinite(Date.parse(expiresAt))) {
    return null;
  }
  return Object.freeze({ sandboxId, sshHost, sshUser, expiresAt });
}
function parseStateSandboxPartition(value) {
  if (value === "none" || value === "team" || value === "user" || value === "session") {
    return value;
  }
  return null;
}
function parseStateSandboxAccess(value) {
  if (value === "r" || value === "rw") {
    return value;
  }
  return null;
}
function parseStateSandboxInterface(value) {
  if (value === "exec" || value === "files") {
    return value;
  }
  return null;
}
function parseStateSandboxLifecycle(value) {
  if (value === "ready" || value === undefined || value === null) {
    return "ready";
  }
  if (value === "resuming") {
    return "resuming";
  }
  return null;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString2(record, key) {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

// ../../../../../tmp/agent-sdk-mirror-7NEIYN/repo/src/state-consent-wrapper.ts
function buildConsentSteer(envelope) {
  return [
    `Using "${envelope.resourceName}" needs the user's consent first.`,
    `Call the \`${REQUEST_STATE_CONSENT_TOOL_NAME}\` tool with exactly these values (do not change or invent them):`,
    JSON.stringify(envelope),
    `The user will be asked to Allow or Deny. On Allow, the capability is granted — retry your original operation. On Deny, do not retry; tell the user you can't proceed without access.`
  ].join(`
`);
}
async function requestStateFilesHandleWithConsent(options) {
  try {
    return { kind: "handle", handle: await requestStateFilesHandle(options) };
  } catch (error) {
    if (error instanceof StateFilesHandleError && error.code === "consent_required" && error.consent) {
      return { kind: "consent_required", steer: buildConsentSteer(error.consent), envelope: error.consent };
    }
    throw error;
  }
}
async function requestStateSandboxHandleWithConsent(options) {
  try {
    return { kind: "handle", handle: await requestStateSandboxHandle(options) };
  } catch (error) {
    if (error instanceof StateSandboxHandleError && error.code === "consent_required" && error.consent) {
      return { kind: "consent_required", steer: buildConsentSteer(error.consent), envelope: error.consent };
    }
    throw error;
  }
}
export {
  requestStateSandboxHandleWithConsent,
  requestStateFilesHandleWithConsent,
  requestStateConsentInputSchema,
  parseConsentEnvelope,
  createRequestStateConsentTool,
  consentPartySchema,
  buildConsentSteer,
  REQUEST_STATE_CONSENT_TOOL_NAME
};
