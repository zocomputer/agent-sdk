// ../../../../../tmp/agent-sdk-mirror-JIbFxf/repo/platform/agent-sandbox/zo-sandbox.ts
import { defineSandbox } from "eve/sandbox";

// ../../../../../tmp/agent-sdk-mirror-JIbFxf/repo/platform/agent-sandbox/ambient.ts
var EVE_CONTEXT_STORAGE_KEY = Symbol.for("eve.context-storage");
var PARENT_SESSION_KEY_NAME = "eve.parentSession";
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

// ../../../../../tmp/agent-sdk-mirror-JIbFxf/repo/platform/runtime-auth/index.ts
import { SignJWT, jwtVerify } from "jose";
var AGENT_TOKEN_HEADER = "x-zo-agent-token";
var EVE_SESSION_HEADER = "x-zo-eve-session";
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

// ../../../../../tmp/agent-sdk-mirror-JIbFxf/repo/platform/agent-sandbox/api-client.ts
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

// ../../../../../tmp/agent-sdk-mirror-JIbFxf/repo/platform/agent-sandbox/ssh-session.ts
import { Client } from "ssh2";
import { extractLines } from "@ai-sdk/provider-utils";

// ../../../../../tmp/agent-sdk-mirror-JIbFxf/repo/platform/agent-sandbox/pure.ts
import { Buffer as Buffer2 } from "node:buffer";
import path from "node:path";
function resolveSandboxPath(workDir, p) {
  if (path.posix.isAbsolute(p))
    return p;
  const resolved = path.posix.join(workDir, p);
  const prefix = workDir.endsWith("/") ? workDir : `${workDir}/`;
  if (resolved !== workDir && !resolved.startsWith(prefix)) {
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

// ../../../../../tmp/agent-sdk-mirror-JIbFxf/repo/platform/agent-sandbox/ssh-connection.ts
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

// ../../../../../tmp/agent-sdk-mirror-JIbFxf/repo/platform/agent-sandbox/ssh-exec.ts
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

// ../../../../../tmp/agent-sdk-mirror-JIbFxf/repo/platform/agent-sandbox/sftp.ts
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

// ../../../../../tmp/agent-sdk-mirror-JIbFxf/repo/platform/agent-sandbox/ssh-session.ts
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
function sshSandboxSession(id, acquireAccess) {
  const resolvePath = (p) => resolveSandboxPath(WORK_DIR, p);
  const manager = new SshConnectionManager({
    acquireAccess,
    expirySkewMs: EXPIRY_SKEW_MS,
    connect: async (access) => {
      const client = await connectSsh(access);
      return {
        client,
        end: () => client.end(),
        onClose: (cb) => void client.on("close", cb)
      };
    }
  });
  const session = {
    id,
    resolvePath,
    async run({ command, workingDirectory, env, abortSignal }) {
      const c = (await manager.ensure()).client;
      return await runOverSsh(c, anchored(command, workingDirectory, env), { abortSignal });
    },
    async spawn({ command, workingDirectory, env, abortSignal }) {
      const c = (await manager.ensure()).client;
      return spawnOverSsh(c, anchored(command, workingDirectory, env), { abortSignal });
    },
    async readBinaryFile({ path: p, abortSignal }) {
      throwIfAborted(abortSignal);
      const c = (await manager.ensure()).client;
      return await sftpReadBytes(c, resolvePath(p));
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
      const c = (await manager.ensure()).client;
      await sftpWriteBytes(c, resolvePath(p), content);
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
      const c = (await manager.ensure()).client;
      await removePath(c, resolvePath(p), { recursive, force });
    },
    setNetworkPolicy: () => {
      throw new Error("zo sandbox: setNetworkPolicy() is not supported from the runtime — network policy is set when the control plane provisions the sandbox.");
    }
  };
  return {
    session,
    currentSandboxId: () => manager.currentSandboxId(),
    dispose: () => manager.dispose()
  };
}

// ../../../../../tmp/agent-sdk-mirror-JIbFxf/repo/platform/agent-sandbox/zo-backend.ts
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
      let lineageRootId = readAmbientParent()?.rootSessionId ?? null;
      let brokeredKey = null;
      const brokerSessionKey = () => {
        if (brokeredKey === null) {
          lineageRootId ??= readAmbientParent()?.rootSessionId ?? null;
          brokeredKey = lineageRootId ?? eveSessionKey;
        }
        return brokeredKey;
      };
      const acquireAccess = async () => await requestScratchSandboxAccess({
        apiBaseUrl: options.apiBaseUrl,
        eveSessionKey: brokerSessionKey()
      });
      const ssh = sshSandboxSession(lineageRootId ?? eveSessionKey, acquireAccess);
      const useSessionFn = () => Promise.resolve(ssh.session);
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
        dispose: () => {
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

// ../../../../../tmp/agent-sdk-mirror-JIbFxf/repo/platform/agent-sandbox/zo-sandbox.ts
var DEFAULT_API_URL = "http://api.zo.localhost:4000";
function zoSandbox(options = {}) {
  return defineSandbox({
    backend: () => zoBackend({
      apiBaseUrl: options.apiBaseUrl ?? process.env.ZO_API_URL ?? DEFAULT_API_URL
    })
  });
}
export {
  zoSandbox,
  zoBackend,
  sshSandboxSession,
  requestScratchSandboxAccess,
  SandboxConsentRequiredError,
  SandboxBrokerError
};
