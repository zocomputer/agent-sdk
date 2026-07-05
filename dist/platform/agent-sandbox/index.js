// ../../../../../tmp/agent-sdk-mirror-9z0BPw/repo/platform/agent-sandbox/zo-sandbox.ts
import { defineSandbox } from "eve/sandbox";

// ../../../../../tmp/agent-sdk-mirror-9z0BPw/repo/platform/runtime-auth/index.ts
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

// ../../../../../tmp/agent-sdk-mirror-9z0BPw/repo/platform/agent-sandbox/api-client.ts
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
async function requestSandboxAccess(input) {
  const doFetch = input.fetch ?? fetch;
  const agentToken = (input.agentToken ?? process.env[AGENT_TOKEN_ENV])?.trim() || undefined;
  const headers = { "content-type": "application/json" };
  if (agentToken)
    headers[AGENT_TOKEN_HEADER] = agentToken;
  headers[EVE_SESSION_HEADER] = input.eveSessionKey;
  const res = await doFetch(`${input.apiBaseUrl}/sandbox/session`, {
    method: "POST",
    headers,
    body: JSON.stringify({ eveSessionKey: input.eveSessionKey })
  });
  if (!res.ok) {
    throw new Error(`sandbox provisioning failed: ${res.status} ${await res.text().catch(() => "")}`.trim());
  }
  const parsed = parseSandboxAccess(await res.json().catch(() => null));
  if (parsed === null) {
    throw new Error("sandbox provisioning returned an unexpected response shape");
  }
  return parsed;
}

// ../../../../../tmp/agent-sdk-mirror-9z0BPw/repo/platform/agent-sandbox/ssh-session.ts
import { Client } from "ssh2";
import { extractLines } from "@ai-sdk/provider-utils";

// ../../../../../tmp/agent-sdk-mirror-9z0BPw/repo/platform/agent-sandbox/pure.ts
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

// ../../../../../tmp/agent-sdk-mirror-9z0BPw/repo/platform/agent-sandbox/ssh-connection.ts
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

// ../../../../../tmp/agent-sdk-mirror-9z0BPw/repo/platform/agent-sandbox/ssh-exec.ts
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
      if (abortSignal?.aborted)
        return reject(abortError(abortSignal));
      if (channelError !== undefined)
        return reject(channelError);
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

// ../../../../../tmp/agent-sdk-mirror-9z0BPw/repo/platform/agent-sandbox/sftp.ts
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
      if (err)
        return reject(err);
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
      if (err)
        return reject(err);
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
      if (err)
        return isNoSuchFile(err) ? resolve(null) : reject(err);
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

// ../../../../../tmp/agent-sdk-mirror-9z0BPw/repo/platform/agent-sandbox/ssh-session.ts
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
      if (err)
        return reject(err);
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
    if (abortSignal.aborted)
      return reject(abortReason());
    onAbort = () => reject(abortReason());
    abortSignal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    for (;; ) {
      const { done, value } = abortSignal === undefined ? await reader.read() : await Promise.race([reader.read(), aborted]);
      if (done)
        break;
      if (value !== undefined) {
        chunks.push(value);
        total += value.length;
      }
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
      if (err)
        return reject(err);
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
      const bytes = await this.readBinaryFile({ path: p, abortSignal });
      return bytes === null ? null : bytesToStream(bytes);
    },
    async readTextFile({ path: p, encoding, startLine, endLine, abortSignal }) {
      const bytes = await this.readBinaryFile({ path: p, abortSignal });
      if (bytes === null)
        return null;
      const text = decodeText(bytes, encoding);
      return startLine === undefined && endLine === undefined ? text : extractLines({ text, startLine, endLine });
    },
    async writeBinaryFile({ path: p, content, abortSignal }) {
      throwIfAborted(abortSignal);
      const c = (await manager.ensure()).client;
      await sftpWriteBytes(c, resolvePath(p), content);
    },
    async writeFile({ path: p, content, abortSignal }) {
      throwIfAborted(abortSignal);
      const bytes = await streamToBytes(content, abortSignal);
      await this.writeBinaryFile({ path: p, content: bytes, abortSignal });
    },
    async writeTextFile({ path: p, content, encoding, abortSignal }) {
      await this.writeBinaryFile({ path: p, content: encodeText(content, encoding), abortSignal });
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

// ../../../../../tmp/agent-sdk-mirror-9z0BPw/repo/platform/agent-sandbox/zo-backend.ts
var BACKEND_NAME = "zo";
function zoBackend(options) {
  return {
    name: BACKEND_NAME,
    async create(input) {
      const rememberedId = readSandboxId(input.existingMetadata);
      const acquireAccess = async () => await requestSandboxAccess({
        apiBaseUrl: options.apiBaseUrl,
        eveSessionKey: input.sessionKey
      });
      const ssh = sshSandboxSession(input.sessionKey, acquireAccess);
      const useSessionFn = async () => ssh.session;
      return {
        session: ssh.session,
        useSessionFn,
        captureState: async () => ({
          backendName: BACKEND_NAME,
          sessionKey: input.sessionKey,
          metadata: {
            daytonaSandboxId: ssh.currentSandboxId() ?? rememberedId ?? ""
          }
        }),
        dispose: async () => {
          ssh.dispose();
        }
      };
    },
    async prewarm(_input) {
      return { reused: false };
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-9z0BPw/repo/platform/agent-sandbox/zo-sandbox.ts
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
  requestSandboxAccess
};
