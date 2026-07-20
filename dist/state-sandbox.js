// ../../../../../tmp/agent-sdk-mirror-rIJSFY/repo/src/state-consent-envelope.ts
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

// ../../../../../tmp/agent-sdk-mirror-rIJSFY/repo/src/state-files.ts
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

// ../../../../../tmp/agent-sdk-mirror-rIJSFY/repo/src/state-sandbox.ts
var STATE_SANDBOX_HANDLE_PATH = "/state/handles";
var ZO_AGENT_TOKEN_HEADER = "x-zo-agent-token";
var ZO_EVE_SESSION_HEADER = "x-zo-eve-session";
var ZO_SESSION_CAPABILITY_HEADER = "x-zo-session-capability";

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
  if (!isRecord(value)) {
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
  const handleId = readString(value, "handleId");
  const declarationName = readString(value, "declarationName");
  const storeId = readString(value, "storeId");
  const stateInstanceId = readString(value, "stateInstanceId");
  const sandboxResourceId = readString(value, "sandboxResourceId");
  const rootPath = readString(value, "rootPath");
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
function createStateSandboxClient(options) {
  const now = options.now ?? (() => new Date);
  const refreshWindowMs = options.refreshWindowMs ?? 60000;
  const renewIntervalMs = options.renewIntervalMs ?? 8 * 60000;
  let cached = null;
  let pending = null;
  let pendingLeaseWaiters = 0;
  let status = { status: "idle" };
  let liveWork = 0;
  let renewTimer = null;
  let lastMintMs = 0;
  let renewNotBeforeMs = 0;
  const renewRetryDelayMs = Math.min(30000, renewIntervalMs);
  const liveProcesses = new Set;
  function scheduleRenewal() {
    if (renewTimer !== null || liveWork === 0)
      return;
    const nowMs = now().getTime();
    const delay = Math.max(lastMintMs + renewIntervalMs - nowMs, renewNotBeforeMs - nowMs, 0);
    renewTimer = setTimeout(() => {
      renewTimer = null;
      renewLease();
    }, delay);
    renewTimer.unref?.();
  }
  function stopRenewal() {
    if (renewTimer !== null) {
      clearTimeout(renewTimer);
      renewTimer = null;
    }
  }
  function workStarted() {
    liveWork += 1;
    if (liveWork === 1)
      scheduleRenewal();
  }
  function workEnded() {
    liveWork -= 1;
    if (liveWork <= 0) {
      liveWork = 0;
      stopRenewal();
    }
  }
  function isLeaseDenial(error) {
    if (typeof error !== "object" || error === null)
      return false;
    const statusCode = error.status;
    if (statusCode === 401 || statusCode === 403)
      return true;
    if (statusCode !== 409)
      return false;
    const code = error.code;
    return code === "binding_revoked" || code === "consent_required";
  }
  async function renewLease() {
    if (liveWork === 0) {
      stopRenewal();
      return;
    }
    try {
      await options.loadHandle();
      lastMintMs = now().getTime();
    } catch (error) {
      if (isLeaseDenial(error)) {
        await terminateOnDenial();
        return;
      }
      renewNotBeforeMs = now().getTime() + renewRetryDelayMs;
    }
    scheduleRenewal();
  }
  async function terminateOnDenial() {
    stopRenewal();
    liveWork = 0;
    for (const process of liveProcesses) {
      try {
        await process.kill();
      } catch {}
    }
    liveProcesses.clear();
    const record = cached;
    cached = null;
    status = { status: "idle" };
    if (record !== null) {
      await record.session.dispose?.();
    }
  }
  function trackSpawned(process) {
    let live = true;
    const settle = () => {
      if (!live)
        return;
      live = false;
      liveProcesses.delete(wrapped);
      workEnded();
    };
    const wrapped = {
      stdout: process.stdout,
      stderr: process.stderr,
      exitCode: process.exitCode.then((code) => {
        settle();
        return code;
      }, (error) => {
        settle();
        throw error;
      }),
      kill: (signal) => {
        const result = process.kill(signal);
        settle();
        return result;
      }
    };
    workStarted();
    liveProcesses.add(wrapped);
    wrapped.exitCode.catch(() => {});
    return wrapped;
  }
  async function disposeCachedSession(record, options2 = {}) {
    if (record.activeUses > 0 || options2.waitForPendingLeases === true && pendingLeaseWaiters > 0) {
      record.disposeWhenIdle = true;
      return;
    }
    if (cached === record) {
      cached = null;
    }
    await record.session.dispose?.();
  }
  async function releaseCachedSession(record) {
    record.activeUses -= 1;
    if (record.activeUses === 0 && record.disposeWhenIdle) {
      await disposeCachedSession(record);
    }
  }
  function ensureSession() {
    const current = cached;
    if (current !== null && !shouldRefreshStateSandboxHandle(current.handle, now(), refreshWindowMs)) {
      return Promise.resolve(current);
    }
    if (pending !== null)
      return pending;
    const previous = cached;
    pending = (async () => {
      try {
        const handle = await options.loadHandle();
        lastMintMs = now().getTime();
        if (handle.lifecycle === "resuming") {
          status = { status: "resuming", handleId: handle.handleId };
        }
        const session = await options.createSession(handle);
        const next = {
          handle,
          session,
          activeUses: 0,
          disposeWhenIdle: false
        };
        cached = next;
        status = { status: "ready", handleId: handle.handleId };
        if (previous !== null) {
          await disposeCachedSession(previous, { waitForPendingLeases: false });
        }
        return next;
      } finally {
        pending = null;
      }
    })();
    return pending;
  }
  async function leaseSession() {
    const sessionPromise = ensureSession();
    pendingLeaseWaiters += 1;
    let record;
    try {
      record = await sessionPromise;
    } finally {
      pendingLeaseWaiters -= 1;
    }
    record.activeUses += 1;
    return {
      handle: record.handle,
      session: record.session,
      release: () => releaseCachedSession(record)
    };
  }
  function buildRemotePath(handle, path) {
    return `${handle.rootPath}/${normalizeStateFilePath(path)}`;
  }
  function workingDirectoryFor(handle, explicit) {
    return explicit === undefined ? handle.rootPath : buildRemotePath(handle, explicit);
  }
  function commandEnv(handle, explicit) {
    const base = options.passAmbientEnvToSessionPartition === true && handle.partition === "session" ? options.ambientEnv : undefined;
    if (base === undefined) {
      return explicit;
    }
    if (explicit === undefined) {
      return base;
    }
    return { ...base, ...explicit };
  }
  function maybeEnv(handle, explicit) {
    const env = commandEnv(handle, explicit);
    return env === undefined ? {} : { env };
  }
  async function withSession(use) {
    const resolved = await leaseSession();
    workStarted();
    try {
      return await use(resolved);
    } finally {
      workEnded();
      await resolved.release();
    }
  }
  async function withWriteSession(use) {
    return await withSession(async (resolved) => {
      if (resolved.handle.access !== "rw") {
        throw new Error(`state sandbox handle "${resolved.handle.handleId}" is read-only`);
      }
      return await use(resolved);
    });
  }
  return {
    files: {
      async read(path) {
        return await withSession(async ({ handle, session }) => await session.readBinaryFile({
          path: buildRemotePath(handle, path)
        }));
      },
      async write(path, content) {
        await withWriteSession(async ({ handle, session }) => {
          const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
          await session.writeBinaryFile({
            path: buildRemotePath(handle, path),
            content: bytes
          });
        });
      },
      async delete(path, deleteOptions) {
        await withWriteSession(async ({ handle, session }) => {
          await session.removePath({
            path: buildRemotePath(handle, path),
            ...deleteOptions?.recursive === undefined ? {} : { recursive: deleteOptions.recursive },
            ...deleteOptions?.force === undefined ? {} : { force: deleteOptions.force }
          });
        });
      }
    },
    status: () => status,
    async exec(command, runOptions) {
      return await withWriteSession(async ({ handle, session }) => await session.run({
        command,
        workingDirectory: workingDirectoryFor(handle, runOptions?.workingDirectory),
        ...maybeEnv(handle, runOptions?.env),
        ...runOptions?.abortSignal === undefined ? {} : { abortSignal: runOptions.abortSignal }
      }));
    },
    async spawn(command, runOptions) {
      return await withWriteSession(async ({ handle, session }) => trackSpawned(await session.spawn({
        command,
        workingDirectory: workingDirectoryFor(handle, runOptions?.workingDirectory),
        ...maybeEnv(handle, runOptions?.env),
        ...runOptions?.abortSignal === undefined ? {} : { abortSignal: runOptions.abortSignal }
      })));
    },
    async dispose() {
      stopRenewal();
      const resolved = pending === null ? cached : await pending;
      if (resolved !== null) {
        await disposeCachedSession(resolved, { waitForPendingLeases: true });
      }
      status = { status: "idle" };
    }
  };
}
function shouldRefreshStateSandboxHandle(handle, now, refreshWindowMs = 60000) {
  const expiresAtMs = Date.parse(handle.sandbox.expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    return true;
  }
  return expiresAtMs - now.getTime() <= refreshWindowMs;
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
  url.pathname = joinUrlPath(url.pathname, STATE_SANDBOX_HANDLE_PATH);
  url.search = "";
  url.hash = "";
  return url.toString();
}
function joinUrlPath(basePath, childPath) {
  const base = basePath.replace(/\/+$/, "");
  const child = childPath.replace(/^\/+/, "");
  return `${base}/${child}`;
}
function buildStateSandboxHandleHeaders(options) {
  const headers = createHeaders(options.headers);
  headers.set("content-type", "application/json");
  if (options.agentToken !== undefined) {
    headers.set(ZO_AGENT_TOKEN_HEADER, options.agentToken);
  }
  if (options.eveSessionKey !== undefined) {
    headers.set(ZO_EVE_SESSION_HEADER, options.eveSessionKey);
  }
  if (options.sessionCapability !== undefined) {
    headers.set(ZO_SESSION_CAPABILITY_HEADER, options.sessionCapability);
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
function parseStateSandboxBrokerError(value) {
  if (!isRecord(value)) {
    return { message: "state sandbox broker request failed", code: null };
  }
  const routeError = readString(value, "error");
  if (routeError !== null) {
    return {
      message: readString(value, "message") ?? "state sandbox broker request failed",
      code: routeError
    };
  }
  const error = isRecord(value.error) ? value.error : value;
  const message = readString(error, "message") ?? "state sandbox broker request failed";
  const code = readString(error, "code") ?? readString(error, "error");
  return { message, code };
}
function parseStateSandboxSshAccess(value) {
  if (!isRecord(value)) {
    return null;
  }
  const sandboxId = readString(value, "sandboxId");
  const sshHost = readString(value, "sshHost");
  const sshUser = readString(value, "sshUser");
  const expiresAt = readString(value, "expiresAt");
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
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
export {
  shouldRefreshStateSandboxHandle,
  requestStateSandboxHandle,
  parseStateSandboxHandle,
  createStateSandboxClient,
  ZO_SESSION_CAPABILITY_HEADER,
  ZO_EVE_SESSION_HEADER,
  ZO_AGENT_TOKEN_HEADER,
  StateSandboxHandleError,
  STATE_SANDBOX_HANDLE_PATH
};
