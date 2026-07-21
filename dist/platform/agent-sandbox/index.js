// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/src/initiator-auth.ts
var SESSION_CAPABILITY_ATTRIBUTE = "zoSessionCapability";
function readSessionCapability(current, initiator) {
  return capabilityFromAuth(current) ?? capabilityFromAuth(initiator);
}
function capabilityFromAuth(value) {
  const capability = value?.attributes?.[SESSION_CAPABILITY_ATTRIBUTE];
  return typeof capability === "string" && capability.trim().length > 0 ? capability : undefined;
}

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/zo-sandbox.ts
import { defineSandbox } from "eve/sandbox";

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/ambient.ts
var EVE_CONTEXT_STORAGE_KEY = Symbol.for("eve.context-storage");
var PARENT_SESSION_KEY_NAME = "eve.parentSession";
var SESSION_ID_KEY_NAME = "eve.sessionId";
var SESSION_KEY_NAME = "eve.session";
var SESSION_CAPABILITY_ATTRIBUTE2 = "zoSessionCapability";
function hasMethod(value, name) {
  return typeof value === "object" && value !== null && typeof value[name] === "function";
}
function nonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
function parseSessionParent(value) {
  if (typeof value !== "object" || value === null)
    return null;
  const v = value;
  const callId = nonBlankString(v.callId);
  const rootSessionId = nonBlankString(v.rootSessionId);
  const sessionId = nonBlankString(v.sessionId);
  if (callId === null || rootSessionId === null || sessionId === null)
    return null;
  return { callId, rootSessionId, sessionId };
}
function ambientSessionParent() {
  try {
    const storage = Reflect.get(globalThis, EVE_CONTEXT_STORAGE_KEY);
    if (!hasMethod(storage, "getStore"))
      return null;
    const store = storage.getStore();
    if (!hasMethod(store, "get"))
      return null;
    return parseSessionParent(store.get({ name: PARENT_SESSION_KEY_NAME }));
  } catch {
    return null;
  }
}
function ambientEveSessionId() {
  try {
    const storage = Reflect.get(globalThis, EVE_CONTEXT_STORAGE_KEY);
    if (!hasMethod(storage, "getStore"))
      return null;
    const store = storage.getStore();
    if (!hasMethod(store, "get"))
      return null;
    return nonBlankString(store.get({ name: SESSION_ID_KEY_NAME }));
  } catch {
    return null;
  }
}
function ambientSessionCapability() {
  try {
    const storage = Reflect.get(globalThis, EVE_CONTEXT_STORAGE_KEY);
    if (!hasMethod(storage, "getStore"))
      return;
    const store = storage.getStore();
    if (!hasMethod(store, "get"))
      return;
    const session = store.get({ name: SESSION_KEY_NAME });
    if (typeof session !== "object" || session === null)
      return;
    const auth = session.auth;
    if (typeof auth !== "object" || auth === null)
      return;
    for (const key of ["current", "initiator"]) {
      const context = auth[key];
      if (typeof context !== "object" || context === null)
        continue;
      const attributes = context.attributes;
      if (typeof attributes !== "object" || attributes === null)
        continue;
      const capability = attributes[SESSION_CAPABILITY_ATTRIBUTE2];
      if (typeof capability === "string" && capability.trim().length > 0) {
        return capability;
      }
    }
    return;
  } catch {
    return;
  }
}

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/runtime-auth/index.ts
import { SignJWT, errors as joseErrors, jwtVerify } from "jose";
var AGENT_TOKEN_HEADER = "x-zo-agent-token";
var EVE_SESSION_HEADER = "x-zo-eve-session";
var SESSION_CAPABILITY_HEADER = "x-zo-session-capability";
var AGENT_TOKEN_ENV = "ZO_AGENT_TOKEN";
var ZO_PLATFORM_ORG = {
  id: "org_zo",
  name: "Zo",
  slug: "zo"
};
var BUILDER_AGENT_IDENTITY = {
  agentProjectId: "agt_builder",
  ownerOrgId: ZO_PLATFORM_ORG.id
};
var LOCAL_AGENT_IDENTITY = {
  agentProjectId: "agt_local",
  ownerOrgId: ZO_PLATFORM_ORG.id
};
var RESERVED_AGENT_PROJECT_IDS = [
  BUILDER_AGENT_IDENTITY.agentProjectId,
  LOCAL_AGENT_IDENTITY.agentProjectId
];

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/api-client.ts
var SCRATCH_DECLARATION = "scratch";
var STATE_HANDLE_PATH = "/state/handles";

class SandboxBrokerError extends Error {
  status;
  code;
  constructor(message, options) {
    super(message);
    this.name = "SandboxBrokerError";
    this.status = options.status;
    this.code = options.code ?? null;
  }
}

class SandboxConsentRequiredError extends SandboxBrokerError {
  consent;
  constructor(consent, options) {
    super(`sandbox access needs the user's consent for "${consent.resourceName}" (consent_required); the binding is awaiting approval.`, { status: options.status, code: "consent_required" });
    this.name = "SandboxConsentRequiredError";
    this.consent = consent;
  }
}
function parseSandboxConsentEnvelope(value) {
  if (typeof value !== "object" || value === null)
    return null;
  const v = value;
  const { bindingId, declarationName, resourceName, party } = v;
  if (typeof bindingId !== "string" || bindingId.length === 0 || typeof declarationName !== "string" || declarationName.length === 0 || typeof resourceName !== "string" || resourceName.length === 0 || typeof party !== "object" || party === null) {
    return null;
  }
  const p = party;
  if (typeof p.handle !== "string" || p.handle.length === 0 || typeof p.external !== "boolean")
    return null;
  const note = p.intentDivergenceNote;
  if (note !== undefined && (typeof note !== "string" || note.length === 0))
    return null;
  return {
    bindingId,
    declarationName,
    resourceName,
    party: {
      handle: p.handle,
      external: p.external,
      ...note === undefined ? {} : { intentDivergenceNote: note }
    }
  };
}
function parseSandboxAccess(value) {
  if (typeof value !== "object" || value === null)
    return null;
  const v = value;
  const { sandboxId, sshHost, sshUser, expiresAt } = v;
  if (typeof sandboxId === "string" && typeof sshHost === "string" && typeof sshUser === "string" && typeof expiresAt === "string") {
    return { sandboxId, sshHost, sshUser, expiresAt };
  }
  return null;
}
function parseSandboxHandleAccess(value) {
  if (typeof value !== "object" || value === null)
    return null;
  const v = value;
  if (v.engine !== "sandbox-daytona")
    return null;
  return parseSandboxAccess(v.sandbox);
}
async function requestScratchSandboxAccess(input) {
  const doFetch = input.fetch ?? fetch;
  const agentToken = (input.agentToken ?? process.env[AGENT_TOKEN_ENV])?.trim() || undefined;
  const eveSessionKey = input.eveSessionKey.trim() || undefined;
  const headers = { "content-type": "application/json" };
  if (agentToken)
    headers[AGENT_TOKEN_HEADER] = agentToken;
  if (eveSessionKey)
    headers[EVE_SESSION_HEADER] = eveSessionKey;
  const sessionCapability = input.sessionCapability?.trim() || undefined;
  if (sessionCapability) {
    headers[SESSION_CAPABILITY_HEADER] = sessionCapability;
  }
  const res = await doFetch(`${input.apiBaseUrl}${STATE_HANDLE_PATH}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      declarationName: SCRATCH_DECLARATION,
      interface: "exec",
      access: "rw",
      suggestedDefaults: { engine: "sandbox-daytona", partition: "session" }
    })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const { code, message } = parseBrokerError(json);
    if (code === "consent_required") {
      const consent = parseSandboxConsentEnvelope(json);
      if (consent !== null)
        throw new SandboxConsentRequiredError(consent, { status: res.status });
    }
    throw new SandboxBrokerError(describeBrokerError(res.status, code, message), {
      status: res.status,
      code
    });
  }
  const access = parseSandboxHandleAccess(json);
  if (access === null) {
    throw new SandboxBrokerError("sandbox broker returned a non-sandbox or malformed state handle", { status: res.status, code: "malformed_handle" });
  }
  return access;
}
function parseBrokerError(value) {
  if (typeof value !== "object" || value === null)
    return { code: null, message: null };
  const v = value;
  return {
    code: typeof v.error === "string" ? v.error : null,
    message: typeof v.message === "string" ? v.message : null
  };
}
function describeBrokerError(status, code, message) {
  if (code === "unsupported_actor") {
    return "sandbox broker rejected the caller: POST /state/handles requires an agent token, not a human session (unsupported_actor). Ensure ZO_AGENT_TOKEN is set.";
  }
  if (code === "eve_session_required") {
    return "sandbox broker requires an eve session: send the x-zo-eve-session header (eve_session_required).";
  }
  const detail = [code, message].filter((s) => s !== null && s.length > 0).join(" — ");
  return `sandbox provisioning failed: ${status}${detail ? ` ${detail}` : ""}`.trim();
}

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/ssh-session.ts
import { Client } from "ssh2";
import { extractLines } from "@ai-sdk/provider-utils";

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/lease-renewal.ts
var DEFAULT_LEASE_RENEW_INTERVAL_MS = 8 * 60000;
var DEFAULT_LEASE_RETRY_DELAY_MS = 30000;
function createLeaseRenewer(options) {
  const intervalMs = options.intervalMs ?? DEFAULT_LEASE_RENEW_INTERVAL_MS;
  const retryDelayMs = Math.min(options.retryDelayMs ?? DEFAULT_LEASE_RETRY_DELAY_MS, intervalMs);
  const now = options.now ?? Date.now;
  let liveWork = 0;
  let timer = null;
  let lastMintMs = now();
  let notBeforeMs = 0;
  let disposed = false;
  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }
  function schedule() {
    if (disposed || timer !== null || liveWork === 0)
      return;
    const nowMs = now();
    const delay = Math.max(lastMintMs + intervalMs - nowMs, notBeforeMs - nowMs, 0);
    timer = setTimeout(() => {
      timer = null;
      renew();
    }, delay);
    timer.unref?.();
  }
  async function renew() {
    if (disposed || liveWork === 0)
      return;
    try {
      await options.renew();
      lastMintMs = now();
    } catch {
      notBeforeMs = now() + retryDelayMs;
    }
    schedule();
  }
  return {
    workStarted() {
      liveWork += 1;
      if (liveWork === 1)
        schedule();
    },
    workEnded() {
      liveWork -= 1;
      if (liveWork <= 0) {
        liveWork = 0;
        clearTimer();
      }
    },
    noteMint() {
      lastMintMs = now();
    },
    dispose() {
      disposed = true;
      liveWork = 0;
      clearTimer();
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/pure.ts
import { Buffer as Buffer2 } from "node:buffer";
import path from "node:path";
var NOMINAL_WORKSPACE_ROOT = "/workspace";
function withinWorkDir(workDir, resolved) {
  const prefix = workDir.endsWith("/") ? workDir : `${workDir}/`;
  return resolved === workDir || resolved.startsWith(prefix);
}
function mapNominalWorkspacePath(workDir, p) {
  if (p === NOMINAL_WORKSPACE_ROOT)
    return workDir;
  const prefix = `${NOMINAL_WORKSPACE_ROOT}/`;
  if (!p.startsWith(prefix))
    return p;
  const rest = p.slice(prefix.length);
  const mapped = rest === "" ? workDir : path.posix.join(workDir, rest);
  if (!withinWorkDir(workDir, mapped)) {
    throw new Error(`sandbox path escapes the work dir: ${p}`);
  }
  return mapped;
}
function resolveSandboxPath(workDir, p) {
  if (path.posix.isAbsolute(p))
    return mapNominalWorkspacePath(workDir, p);
  const resolved = path.posix.join(workDir, p);
  if (!withinWorkDir(workDir, resolved)) {
    throw new Error(`sandbox path escapes the work dir: ${p}`);
  }
  return resolved;
}
function shellSingleQuote(s) {
  return `'${s.replaceAll("'", "'\\''")}'`;
}
function readSandboxId(metadata) {
  const id = metadata?.daytonaSandboxId;
  return typeof id === "string" && id !== "" ? id : null;
}
function resolveEncoding(encoding) {
  if (encoding === undefined || /^utf-?8$/i.test(encoding))
    return "utf8";
  if (Buffer2.isEncoding(encoding))
    return encoding;
  throw new Error(`zo sandbox: unsupported text encoding ${JSON.stringify(encoding)}`);
}
function decodeText(bytes, encoding) {
  const enc = resolveEncoding(encoding);
  if (enc === "utf8")
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return Buffer2.from(bytes).toString(enc);
}
function encodeText(text, encoding) {
  const enc = resolveEncoding(encoding);
  if (enc === "utf8")
    return new TextEncoder().encode(text);
  return new Uint8Array(Buffer2.from(text, enc));
}

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/ssh-connection.ts
function isExpired(access, skewMs, now) {
  const expiry = Date.parse(access.expiresAt);
  if (Number.isNaN(expiry))
    return true;
  return expiry - skewMs <= now;
}

class SshConnectionManager {
  conn = null;
  access = null;
  connecting = null;
  disposed = false;
  sandboxId = null;
  opts;
  now;
  constructor(opts) {
    this.opts = opts;
    this.now = opts.now ?? Date.now;
  }
  currentSandboxId() {
    return this.sandboxId;
  }
  expired(access) {
    return isExpired(access, this.opts.expirySkewMs, this.now());
  }
  async ensure() {
    if (this.disposed)
      throw new Error("zo sandbox: session is disposed");
    if (this.conn !== null && this.access !== null && !this.expired(this.access)) {
      return this.conn;
    }
    if (this.connecting !== null)
      return await this.connecting;
    const held = this.access;
    this.conn?.end();
    this.conn = null;
    this.connecting = this.openConnection(held);
    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }
  async openConnection(held) {
    const abortIfDisposed = () => {
      if (this.disposed)
        throw new Error("zo sandbox: session disposed during connect");
    };
    let used;
    if (held !== null && !this.expired(held)) {
      used = held;
    } else {
      abortIfDisposed();
      used = await this.opts.acquireAccess();
    }
    abortIfDisposed();
    let c;
    try {
      c = await this.opts.connect(used);
    } catch (error) {
      if (used === held) {
        abortIfDisposed();
        used = await this.opts.acquireAccess();
        abortIfDisposed();
        c = await this.opts.connect(used);
      } else {
        throw error;
      }
    }
    if (this.disposed) {
      c.end();
      throw new Error("zo sandbox: session disposed during connect");
    }
    c.onClose(() => {
      if (this.conn === c)
        this.conn = null;
    });
    this.conn = c;
    this.access = used;
    this.sandboxId = used.sandboxId;
    return c;
  }
  dispose() {
    this.disposed = true;
    this.conn?.end();
    this.conn = null;
    this.access = null;
  }
}

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/ssh-exec.ts
var SIGNAL_EXIT_CODE = 137;
function abortError(signal) {
  return signal.reason instanceof Error ? signal.reason : new Error(typeof signal.reason === "string" ? signal.reason : "aborted");
}
function awaitCommand(stream, abortSignal) {
  return new Promise((resolve, reject) => {
    let code = null;
    let signal = null;
    let sawExit = false;
    let settled = false;
    const onAbort = () => {
      try {
        stream.close();
      } catch {}
      settle();
    };
    const settle = (channelError) => {
      if (settled)
        return;
      settled = true;
      abortSignal?.removeEventListener("abort", onAbort);
      if (abortSignal?.aborted) {
        reject(abortError(abortSignal));
        return;
      }
      if (channelError !== undefined) {
        reject(channelError);
        return;
      }
      const sig = signal;
      const reconciled = sig != null ? SIGNAL_EXIT_CODE : code ?? 0;
      resolve({ exitCode: reconciled, signal: sig });
    };
    if (abortSignal?.aborted) {
      onAbort();
      return;
    }
    abortSignal?.addEventListener("abort", onAbort, { once: true });
    stream.on("exit", (c, s) => {
      sawExit = true;
      code = c;
      signal = s ?? null;
    }).on("close", (closeCode, closeSignal) => {
      if (!sawExit) {
        code = closeCode ?? null;
        signal = closeSignal ?? null;
      }
      settle();
    }).on("error", (e) => settle(e));
  });
}

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/sftp.ts
import path2 from "node:path";
var SFTP_NO_SUCH_FILE = 2;
function isNoSuchFile(error) {
  return typeof error === "object" && error !== null && error.code === SFTP_NO_SUCH_FILE;
}
var sftpByClient = new WeakMap;
function getSftp(client) {
  const existing = sftpByClient.get(client);
  if (existing !== undefined)
    return existing;
  const opening = new Promise((resolve, reject) => {
    client.sftp((err, sftp) => {
      if (err) {
        reject(err);
        return;
      }
      const evict = () => {
        if (sftpByClient.get(client) === opening)
          sftpByClient.delete(client);
      };
      sftp.on("close", evict).on("error", evict);
      resolve(sftp);
    });
  });
  opening.catch(() => {
    if (sftpByClient.get(client) === opening)
      sftpByClient.delete(client);
  });
  sftpByClient.set(client, opening);
  return opening;
}
function exec(client, command) {
  return new Promise((resolve, reject) => {
    client.exec(command, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      let stderr = "";
      stream.on("data", () => {}).stderr.on("data", (d) => stderr += d.toString());
      awaitCommand(stream).then(({ exitCode }) => resolve({ exitCode, stderr }), reject);
    });
  });
}
async function ensureParentDir(client, filePath) {
  const dir = path2.posix.dirname(filePath);
  if (dir === "" || dir === "." || dir === "/")
    return;
  const r = await exec(client, `mkdir -p ${shellSingleQuote(dir)}`);
  if (r.exitCode !== 0) {
    throw new Error(`sandbox: mkdir -p ${dir} failed (exit ${r.exitCode}): ${r.stderr.trim()}`);
  }
}
async function sftpReadBytes(client, remotePath) {
  const sftp = await getSftp(client);
  return await new Promise((resolve, reject) => {
    sftp.readFile(remotePath, (err, buf) => {
      if (err) {
        if (isNoSuchFile(err))
          resolve(null);
        else
          reject(err);
        return;
      }
      resolve(new Uint8Array(buf));
    });
  });
}
async function sftpWriteBytes(client, remotePath, bytes) {
  await ensureParentDir(client, remotePath);
  const sftp = await getSftp(client);
  await new Promise((resolve, reject) => {
    sftp.writeFile(remotePath, Buffer.from(bytes), (err) => err ? reject(err) : resolve());
  });
}
async function removePath(client, remotePath, opts = {}) {
  const flags = `${opts.recursive ? "r" : ""}${opts.force ? "f" : ""}`;
  const rm = flags === "" ? "rm" : `rm -${flags}`;
  const r = await exec(client, `${rm} ${shellSingleQuote(remotePath)}`);
  if (r.exitCode !== 0) {
    throw new Error(`sandbox: ${rm} ${remotePath} failed (exit ${r.exitCode}): ${r.stderr.trim()}`);
  }
}

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/ssh-session.ts
var WORK_DIR = "/home/daytona";
var EXPIRY_SKEW_MS = 30000;
var SSH_PORT = 22;
function connectSsh(access) {
  const conn = new Client;
  return new Promise((resolve, reject) => {
    conn.on("ready", () => resolve(conn)).on("error", reject).connect({
      host: access.sshHost,
      port: SSH_PORT,
      username: access.sshUser,
      tryKeyboard: false
    });
  });
}
function runOverSsh(conn, command, options = {}) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      let stdout = "";
      let stderr = "";
      stream.on("data", (d) => stdout += d.toString()).stderr.on("data", (d) => stderr += d.toString());
      awaitCommand(stream, options.abortSignal).then(({ exitCode, signal }) => resolve({
        exitCode,
        stdout,
        stderr: signal != null ? `${stderr}
[killed by signal ${signal}]` : stderr
      }), reject);
    });
  });
}
function anchored(command, workingDirectory, env) {
  const dir = shellSingleQuote(resolveSandboxPath(WORK_DIR, workingDirectory ?? "."));
  const envPrefix = env === undefined || Object.keys(env).length === 0 ? "" : `${Object.entries(env).map(([k, v]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) {
      throw new Error(`zo sandbox: invalid environment variable name ${JSON.stringify(k)}`);
    }
    return `${k}=${shellSingleQuote(v)}`;
  }).join(" ")} `;
  return `mkdir -p ${dir} && cd ${dir} && ${envPrefix}${command}`;
}
function throwIfAborted(signal) {
  if (signal?.aborted)
    throw signal.reason ?? new Error("operation aborted");
}
function bytesToStream(bytes) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
}
async function streamToBytes(stream, abortSignal) {
  const chunks = [];
  let total = 0;
  const reader = stream.getReader();
  const abortReason = () => (abortSignal?.reason instanceof Error ? abortSignal.reason : null) ?? new Error("write aborted");
  let onAbort;
  const aborted = new Promise((_, reject) => {
    if (abortSignal === undefined)
      return;
    if (abortSignal.aborted) {
      reject(abortReason());
      return;
    }
    onAbort = () => reject(abortReason());
    abortSignal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    for (;; ) {
      const { done, value } = abortSignal === undefined ? await reader.read() : await Promise.race([reader.read(), aborted]);
      if (done)
        break;
      chunks.push(value);
      total += value.length;
    }
  } catch (e) {
    await reader.cancel(e);
    throw e;
  } finally {
    if (onAbort !== undefined)
      abortSignal?.removeEventListener("abort", onAbort);
    aborted.catch(() => {});
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
function nodeToWebStream(node) {
  let done = false;
  return new ReadableStream({
    start(controller) {
      node.on("data", (d) => {
        if (done)
          return;
        try {
          controller.enqueue(new Uint8Array(d));
        } catch {
          done = true;
          node.destroy();
          return;
        }
        if ((controller.desiredSize ?? 1) <= 0)
          node.pause();
      });
      node.on("end", () => {
        if (done)
          return;
        done = true;
        controller.close();
      });
      node.on("error", (e) => {
        if (done)
          return;
        done = true;
        controller.error(e);
      });
    },
    pull() {
      node.resume();
    },
    cancel() {
      done = true;
      node.destroy();
    }
  });
}
function spawnOverSsh(conn, command, options = {}) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(buildSpawnedProcess(stream, options));
    });
  });
}
function buildSpawnedProcess(stream, options = {}) {
  let killed = false;
  const kill = () => {
    if (!killed) {
      killed = true;
      try {
        stream.signal("KILL");
        stream.close();
      } catch {}
    }
    return Promise.resolve();
  };
  const exit = awaitCommand(stream, options.abortSignal);
  exit.catch(() => {});
  const wait = () => exit.then(({ exitCode }) => ({ exitCode }));
  return {
    stdout: nodeToWebStream(stream),
    stderr: nodeToWebStream(stream.stderr),
    wait,
    kill
  };
}
function sshSandboxSession(id, acquireAccess, connect = async (access) => {
  const client = await connectSsh(access);
  return {
    client,
    end: () => client.end(),
    onClose: (cb) => void client.on("close", cb)
  };
}, leaseOptions = {}) {
  const resolvePath = (p) => resolveSandboxPath(WORK_DIR, p);
  const renewer = createLeaseRenewer({
    renew: async () => {
      await acquireAccess();
    },
    ...leaseOptions
  });
  const mintTracked = async () => {
    const access = await acquireAccess();
    renewer.noteMint();
    return access;
  };
  const manager = new SshConnectionManager({
    acquireAccess: mintTracked,
    expirySkewMs: EXPIRY_SKEW_MS,
    connect
  });
  const withLease = async (fn) => {
    renewer.workStarted();
    try {
      return await fn();
    } finally {
      renewer.workEnded();
    }
  };
  const trackSpawnedLease = (process2) => {
    renewer.workStarted();
    let settled = false;
    const settle = () => {
      if (settled)
        return;
      settled = true;
      renewer.workEnded();
    };
    const exit = process2.wait();
    exit.then(settle, settle);
    return {
      stdout: process2.stdout,
      stderr: process2.stderr,
      wait: () => exit.then(({ exitCode }) => ({ exitCode })),
      kill: async () => {
        try {
          await process2.kill();
        } finally {
          settle();
        }
      }
    };
  };
  const session = {
    id,
    resolvePath,
    async run({ command, workingDirectory, env, abortSignal }) {
      return await withLease(async () => {
        const c = (await manager.ensure()).client;
        return await runOverSsh(c, anchored(command, workingDirectory, env), { abortSignal });
      });
    },
    async spawn({ command, workingDirectory, env, abortSignal }) {
      renewer.workStarted();
      try {
        const c = (await manager.ensure()).client;
        const process2 = await spawnOverSsh(c, anchored(command, workingDirectory, env), { abortSignal });
        return trackSpawnedLease(process2);
      } finally {
        renewer.workEnded();
      }
    },
    async readBinaryFile({ path: p, abortSignal }) {
      throwIfAborted(abortSignal);
      return await withLease(async () => {
        const c = (await manager.ensure()).client;
        return await sftpReadBytes(c, resolvePath(p));
      });
    },
    async readFile({ path: p, abortSignal }) {
      const bytes = await this.readBinaryFile({
        path: p,
        ...abortSignal !== undefined ? { abortSignal } : {}
      });
      return bytes === null ? null : bytesToStream(bytes);
    },
    async readTextFile({ path: p, encoding, startLine, endLine, abortSignal }) {
      const bytes = await this.readBinaryFile({
        path: p,
        ...abortSignal !== undefined ? { abortSignal } : {}
      });
      if (bytes === null)
        return null;
      const text = decodeText(bytes, encoding);
      return startLine === undefined && endLine === undefined ? text : extractLines({
        text,
        ...startLine !== undefined ? { startLine } : {},
        ...endLine !== undefined ? { endLine } : {}
      });
    },
    async writeBinaryFile({ path: p, content, abortSignal }) {
      throwIfAborted(abortSignal);
      await withLease(async () => {
        const c = (await manager.ensure()).client;
        await sftpWriteBytes(c, resolvePath(p), content);
      });
    },
    async writeFile({ path: p, content, abortSignal }) {
      throwIfAborted(abortSignal);
      const bytes = await streamToBytes(content, abortSignal);
      await this.writeBinaryFile({
        path: p,
        content: bytes,
        ...abortSignal !== undefined ? { abortSignal } : {}
      });
    },
    async writeTextFile({ path: p, content, encoding, abortSignal }) {
      await this.writeBinaryFile({
        path: p,
        content: encodeText(content, encoding),
        ...abortSignal !== undefined ? { abortSignal } : {}
      });
    },
    async removePath({ path: p, recursive, force, abortSignal }) {
      throwIfAborted(abortSignal);
      await withLease(async () => {
        const c = (await manager.ensure()).client;
        await removePath(c, resolvePath(p), { recursive, force });
      });
    },
    setNetworkPolicy: () => {
      throw new Error("zo sandbox: setNetworkPolicy() is not supported from the runtime — network policy is set when the control plane provisions the sandbox.");
    }
  };
  return {
    session,
    currentSandboxId: () => manager.currentSandboxId(),
    dispose: () => {
      renewer.dispose();
      manager.dispose();
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/zo-backend.ts
var BACKEND_NAME = "zo";
function zoBackend(options) {
  return {
    name: BACKEND_NAME,
    create(input) {
      const rememberedId = readSandboxId(input.existingMetadata);
      const eveSessionKey = input.tags?.sessionId?.trim();
      if (eveSessionKey === undefined || eveSessionKey.length === 0) {
        throw new Error("zoBackend.create: eve did not supply a non-blank tags.sessionId (the raw session id the state broker partitions on)");
      }
      const readAmbientParent = options.ambientParent ?? ambientSessionParent;
      const readAmbientCapability = options.ambientCapability ?? ambientSessionCapability;
      let lineageRootId = readAmbientParent()?.rootSessionId ?? null;
      let brokeredKey = null;
      const brokerSessionKey = () => {
        if (brokeredKey === null) {
          lineageRootId ??= readAmbientParent()?.rootSessionId ?? null;
          brokeredKey = lineageRootId ?? eveSessionKey;
        }
        return brokeredKey;
      };
      let latchedCapability = readAmbientCapability();
      const brokerSessionCapability = () => {
        latchedCapability ??= readAmbientCapability();
        return latchedCapability;
      };
      const acquireAccess = async () => {
        const sessionCapability = brokerSessionCapability();
        return await requestScratchSandboxAccess({
          apiBaseUrl: options.apiBaseUrl,
          eveSessionKey: brokerSessionKey(),
          ...sessionCapability === undefined ? {} : { sessionCapability }
        });
      };
      const ssh = sshSandboxSession(lineageRootId ?? eveSessionKey, acquireAccess);
      const useSessionFn = (sessionOptions) => {
        const directCapability = sessionOptions?.sessionCapability?.trim();
        if (directCapability !== undefined && directCapability.length > 0) {
          latchedCapability ??= directCapability;
        }
        return Promise.resolve(ssh.session);
      };
      return Promise.resolve({
        session: ssh.session,
        useSessionFn,
        captureState: () => Promise.resolve({
          backendName: BACKEND_NAME,
          sessionKey: input.sessionKey,
          metadata: {
            daytonaSandboxId: ssh.currentSandboxId() ?? rememberedId ?? "",
            ...lineageRootId === null ? {} : { brokeredSessionKey: lineageRootId }
          }
        }),
        shutdown: () => {
          ssh.dispose();
          return Promise.resolve();
        }
      });
    },
    prewarm(_input) {
      return Promise.resolve({ reused: false });
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/zo-sandbox.ts
var DEFAULT_API_URL = "http://api.zo.localhost:4000";
function zoSandbox(options = {}) {
  return defineSandbox({
    backend: () => zoBackend({
      apiBaseUrl: options.apiBaseUrl ?? process.env.ZO_API_URL ?? DEFAULT_API_URL
    }),
    onSession: async ({ ctx, use }) => {
      const sessionCapability = readSessionCapability(ctx.session.auth.current, ctx.session.auth.initiator);
      await use(sessionCapability === undefined ? undefined : { sessionCapability });
    }
  });
}
// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/src/state-consent-envelope.ts
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

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/src/state-files.ts
function normalizeStateFilePath(path3) {
  if (path3.length === 0) {
    throw new Error("state file path must not be empty");
  }
  if (path3.startsWith("/")) {
    throw new Error(`state file path "${path3}" must be relative`);
  }
  const segments = path3.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new Error(`state file path "${path3}" must not contain empty, . or .. segments`);
  }
  return path3;
}

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/src/state-sandbox.ts
var STATE_SANDBOX_HANDLE_PATH = "/state/handles";
var ZO_AGENT_TOKEN_HEADER = "x-zo-agent-token";
var ZO_EVE_SESSION_HEADER = "x-zo-eve-session";
var ZO_SESSION_CAPABILITY_HEADER = "x-zo-session-capability";
var STATE_SANDBOX_HANDLE_ERROR_BRAND = Symbol.for("@zocomputer/agent-sdk/StateSandboxHandleError");

class StateSandboxHandleError extends Error {
  status;
  code;
  consent;
  static [Symbol.hasInstance](value) {
    if (this !== StateSandboxHandleError) {
      return Function.prototype[Symbol.hasInstance].call(this, value);
    }
    return typeof value === "object" && value !== null && Reflect.get(value, STATE_SANDBOX_HANDLE_ERROR_BRAND) === true;
  }
  constructor(message, options) {
    super(message);
    Object.defineProperty(this, STATE_SANDBOX_HANDLE_ERROR_BRAND, {
      value: true
    });
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
    for (const process2 of liveProcesses) {
      try {
        await process2.kill();
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
  function trackSpawned(process2) {
    let live = true;
    const settle = () => {
      if (!live)
        return;
      live = false;
      liveProcesses.delete(wrapped);
      workEnded();
    };
    const wrapped = {
      stdout: process2.stdout,
      stderr: process2.stderr,
      exitCode: process2.exitCode.then((code) => {
        settle();
        return code;
      }, (error) => {
        settle();
        throw error;
      }),
      kill: (signal) => {
        const result = process2.kill(signal);
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
  function buildRemotePath(handle, path3) {
    return `${handle.rootPath}/${normalizeStateFilePath(path3)}`;
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
      async read(path3) {
        return await withSession(async ({ handle, session }) => await session.readBinaryFile({
          path: buildRemotePath(handle, path3)
        }));
      },
      async write(path3, content) {
        await withWriteSession(async ({ handle, session }) => {
          const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
          await session.writeBinaryFile({
            path: buildRemotePath(handle, path3),
            content: bytes
          });
        });
      },
      async delete(path3, deleteOptions) {
        await withWriteSession(async ({ handle, session }) => {
          await session.removePath({
            path: buildRemotePath(handle, path3),
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

// ../../../../../tmp/agent-sdk-mirror-JVL2mN/repo/platform/agent-sandbox/state-client.ts
var DEFAULT_API_URL2 = "http://api.zo.localhost:4000";
var SCRATCH_DECLARATION_NAME = "scratch";
function zoStateSandbox(declaration, options = {}) {
  if (declaration.interface !== "exec" && declaration.interface !== "files") {
    throw new Error(`zoStateSandbox: declaration "${declaration.name}" has interface "${declaration.interface}" — only "exec" and "files" declarations are sandbox-backed`);
  }
  const iface = declaration.interface;
  const readAmbientParent = options.ambientParent ?? ambientSessionParent;
  const readAmbientSessionId = options.ambientSessionId ?? ambientEveSessionId;
  const readAmbientCapability = options.ambientCapability ?? ambientSessionCapability;
  let latchedSessionKey = readAmbientParent()?.rootSessionId ?? readAmbientSessionId();
  const brokerSessionKey = () => {
    latchedSessionKey ??= readAmbientParent()?.rootSessionId ?? readAmbientSessionId();
    return latchedSessionKey;
  };
  let latchedCapability = readAmbientCapability();
  const brokerSessionCapability = () => {
    latchedCapability ??= readAmbientCapability();
    return latchedCapability;
  };
  const loadHandle = async () => {
    const sessionKey = brokerSessionKey();
    const sessionCapability = brokerSessionCapability();
    const agentToken = (options.agentToken ?? process.env[AGENT_TOKEN_ENV])?.trim() || undefined;
    return await requestStateSandboxHandle({
      fetch: options.fetch ?? fetch,
      apiBaseUrl: options.apiBaseUrl ?? process.env.ZO_API_URL ?? DEFAULT_API_URL2,
      declarationName: declaration.name,
      interface: iface,
      access: declaration.access,
      ...agentToken === undefined ? {} : { agentToken },
      ...sessionKey === null ? {} : { eveSessionKey: sessionKey },
      ...sessionCapability === undefined ? {} : { sessionCapability },
      suggestedDefaults: {
        engine: "sandbox-daytona",
        ...declaration.suggestedDefaults?.partition === undefined ? {} : { partition: declaration.suggestedDefaults.partition },
        ...declaration.suggestedDefaults?.lifecycle === undefined ? {} : { lifecycle: declaration.suggestedDefaults.lifecycle }
      }
    });
  };
  return createStateSandboxClient({
    loadHandle,
    createSession: options.createSession ?? ((handle) => sshStateSession(handle, loadHandle)),
    ...options.now === undefined ? {} : { now: options.now },
    ...options.refreshWindowMs === undefined ? {} : { refreshWindowMs: options.refreshWindowMs },
    ...options.ambientEnv === undefined ? {} : { ambientEnv: options.ambientEnv },
    passAmbientEnvToSessionPartition: declaration.name === SCRATCH_DECLARATION_NAME && options.ambientEnv !== undefined
  });
}
function sshStateSession(handle, remint) {
  const initialAccess = {
    sandboxId: handle.sandbox.sandboxId,
    sshHost: handle.sandbox.sshHost,
    sshUser: handle.sandbox.sshUser,
    expiresAt: handle.sandbox.expiresAt
  };
  let mintedInitial = false;
  const acquireAccess = async () => {
    if (!mintedInitial) {
      mintedInitial = true;
      return initialAccess;
    }
    if (remint === undefined)
      return initialAccess;
    const fresh = await remint();
    return {
      sandboxId: fresh.sandbox.sandboxId,
      sshHost: fresh.sandbox.sshHost,
      sshUser: fresh.sandbox.sshUser,
      expiresAt: fresh.sandbox.expiresAt
    };
  };
  const ssh = sshSandboxSession(handle.stateInstanceId, acquireAccess);
  const session = {
    async run(runOptions) {
      return await ssh.session.run(runOptions);
    },
    async spawn(spawnOptions) {
      const process2 = await ssh.session.spawn(spawnOptions);
      const exitCode = Promise.resolve(process2.wait()).then(({ exitCode: code }) => code);
      exitCode.catch(() => {});
      const spawned = {
        stdout: process2.stdout,
        stderr: process2.stderr,
        exitCode,
        kill: () => Promise.resolve(process2.kill())
      };
      return spawned;
    },
    async readBinaryFile(readOptions) {
      return await ssh.session.readBinaryFile(readOptions);
    },
    async writeBinaryFile(writeOptions) {
      await ssh.session.writeBinaryFile(writeOptions);
    },
    async removePath(removeOptions) {
      await ssh.session.removePath(removeOptions);
    },
    dispose() {
      ssh.dispose();
    }
  };
  return Promise.resolve(session);
}
export {
  zoStateSandbox,
  zoSandbox,
  zoBackend,
  sshSandboxSession,
  requestScratchSandboxAccess,
  SandboxConsentRequiredError,
  SandboxBrokerError
};
