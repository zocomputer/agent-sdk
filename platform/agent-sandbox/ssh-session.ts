import type { Readable } from "node:stream";
import { Client, type ClientChannel } from "ssh2";
import type { SandboxSession } from "eve/sandbox";
import { extractLines } from "@ai-sdk/provider-utils";
import { decodeText, encodeText, resolveSandboxPath, shellSingleQuote } from "./pure";
import { SshConnectionManager, type SshSandboxAccess } from "./ssh-connection";
import { awaitCommand } from "./ssh-exec";
import { removePath as sftpRemovePath, sftpReadBytes, sftpWriteBytes } from "./sftp";

// An eve `SandboxSession` backed by an SSH connection to the sandbox, using the
// scoped, short-lived token the control plane (apps/api) minted. The runtime
// holds NO Daytona key — only this token — so a leak exposes one sandbox for a
// few minutes, not the org (see plans/rc2/sandbox-per-session.md threat model).
//
// The SSH token is short-lived (~10 min), so the connection is established
// LAZILY per call and re-provisioned (fresh token via `acquireAccess`) when it
// has dropped or the token is near expiry — long sessions don't fail when the
// first token expires.
//
// Implements `run` (exec), `spawn` (long-running process), and the file I/O
// methods (byte/binary/text read+write, removePath) over SSH — exec for
// commands/dir ops, SFTP for byte transfer (see ./sftp). eve does not expose
// `buildSandboxSession`, so we construct the full public surface ourselves.
// `setNetworkPolicy` is set at provision time by the control plane, not here.

// `SshSandboxAccess` (the scoped credential) lives with the connection lifecycle
// in ./ssh-connection; re-export it so existing importers (api-client, zo-backend)
// are unchanged.
export type { SshSandboxAccess };

/**
 * Work dir relative paths anchor to. eve's `SandboxSession` contract nominally
 * resolves relative paths from `/workspace`, but on Daytona's default image
 * `/workspace` doesn't exist and the sandbox user (`daytona`) can't create it
 * (it's a root-owned mount point — verified: `mkdir /workspace` → permission
 * denied). So we anchor to the user's home, which is where SSH lands and is
 * writable. The divergence only matters if an authored agent hardcodes the
 * literal `/workspace`; surfacing a real writable workspace at that path would
 * need a base image that pre-creates + chowns it (a snapshot/bootstrap follow-up).
 */
const WORK_DIR = "/home/daytona";

/** Re-mint a token this many ms before it actually expires (clock skew + RTT). */
const EXPIRY_SKEW_MS = 30_000;

/**
 * SSH port for Daytona's gateway. Daytona's `sshCommand` is always
 * `ssh <token>@<host>` with no `-p`, i.e. the default port 22 — the host
 * (`access.sshHost`) is what varies, not the port. Named here rather than
 * inlined so it's one obvious place to change if that ever stops holding.
 */
const SSH_PORT = 22;


/** Open an SSH connection to the sandbox with the scoped token. */
export function connectSsh(access: SshSandboxAccess): Promise<Client> {
  const conn = new Client();
  return new Promise((resolve, reject) => {
    conn
      .on("ready", () => resolve(conn))
      .on("error", reject)
      .connect({
        host: access.sshHost,
        port: SSH_PORT,
        username: access.sshUser,
        // The token IS the credential; no password/key auth.
        tryKeyboard: false,
      });
  });
}


/**
 * Run one command over the SSH connection, collecting stdout/stderr + exit code.
 *
 * Status comes from ssh2's `exit` event `(code, signal)`, falling back to the
 * args `close` carries. A signal (OOM / timeout SIGKILL) reports a non-zero code
 * + a note on stderr — never a clean exit 0 the agent would mistake for success.
 * `abortSignal` closes the stream to cancel; a stream error rejects. (env is
 * inlined into `command` by the caller — see `anchored` — not passed here.)
 *
 * KNOWN LIMITATION (follow-up): ssh2 doesn't guarantee `exit` fires before
 * `close`, and for instant-completing commands it sometimes delivers neither a
 * code nor a signal — so a fast failing command can report exit 0. Long-running
 * commands (the case that matters for OOM/timeout) reliably carry their status.
 * The deterministic fix is to wrap the command to print its own `$?` and parse
 * it from stdout; deferred with the other runtime follow-ups (see plan).
 */
function runOverSsh(
  conn: Client,
  command: string,
  options: { abortSignal?: AbortSignal | undefined } = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = "";
      let stderr = "";
      stream
        .on("data", (d: Buffer) => (stdout += d.toString()))
        .stderr.on("data", (d: Buffer) => (stderr += d.toString()));
      // awaitCommand owns exit reconciliation + abort precedence; we just add the
      // collected output and a stderr note when a signal killed the command.
      awaitCommand(stream, options.abortSignal).then(
        ({ exitCode, signal }) =>
          resolve({
            exitCode,
            stdout,
            stderr: signal != null ? `${stderr}\n[killed by signal ${signal}]` : stderr,
          }),
        reject,
      );
    });
  });
}

// --- helpers for the file + spawn surface ---

/**
 * Build the shell command run + spawn actually send: an optional per-command
 * `env` prefix, the work-dir anchoring prelude, then the command.
 *
 * - **env** is inlined as `VAR='val' …` prefixes (values shell-quoted) rather
 *   than ssh2's SSH `env` channel request, which Daytona's sshd silently drops
 *   (it isn't `AcceptEnv`-listed) — so inlining is what actually sets them.
 * - **work dir**: SSH lands in $HOME, not /workspace (which doesn't exist by
 *   default), so we `cd` into the resolved dir — relative paths then resolve
 *   from WORK_DIR per eve's contract, and `mkdir -p` makes it exist on first
 *   use. The dir is shell-quoted; the command itself is intentionally shell.
 */
function anchored(
  command: string,
  workingDirectory: string | undefined,
  env: Record<string, string> | undefined,
): string {
  const dir = shellSingleQuote(resolveSandboxPath(WORK_DIR, workingDirectory ?? "."));
  const envPrefix =
    env === undefined || Object.keys(env).length === 0
      ? ""
      : `${Object.entries(env)
          .map(([k, v]) => {
            // A `KEY=val` prefix can't safely quote the KEY (it's shell syntax,
            // not a word), so reject anything that isn't a valid POSIX env name
            // rather than let a metacharacter-laden key inject. Values ARE quoted.
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) {
              throw new Error(`zo sandbox: invalid environment variable name ${JSON.stringify(k)}`);
            }
            return `${k}=${shellSingleQuote(v)}`;
          })
          .join(" ")} `;
  return `mkdir -p ${dir} && cd ${dir} && ${envPrefix}${command}`;
}

/** Throw the abort reason if already aborted (the cheap upfront cancellation check). */
function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw signal.reason ?? new Error("operation aborted");
}

/** Wrap raw bytes as a one-chunk web ReadableStream (the lowest-level read primitive). */
function bytesToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

/**
 * Collect a web ReadableStream of bytes into one Uint8Array, honoring abort.
 * Each read is RACED against the abort signal, so an abort that fires while a
 * read is pending (a slow/blocked producer) cancels the reader immediately
 * rather than waiting for that read to resolve first.
 */
export async function streamToBytes(
  stream: ReadableStream<Uint8Array>,
  abortSignal?: AbortSignal | undefined,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = stream.getReader();
  const abortReason = (): Error =>
    (abortSignal?.reason instanceof Error ? abortSignal.reason : null) ??
    new Error("write aborted");

  // A promise that rejects the moment the signal aborts (or is already aborted).
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    if (abortSignal === undefined) return;
    if (abortSignal.aborted) return reject(abortReason());
    onAbort = () => reject(abortReason());
    abortSignal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    for (;;) {
      const { done, value } =
        abortSignal === undefined
          ? await reader.read()
          : await Promise.race([reader.read(), aborted]);
      if (done) break;
      if (value !== undefined) {
        chunks.push(value);
        total += value.length;
      }
    }
  } catch (e) {
    await reader.cancel(e); // abort (or a read error) → release the producer
    throw e;
  } finally {
    if (onAbort !== undefined) abortSignal?.removeEventListener("abort", onAbort);
    // Swallow the unraced abort rejection so it can't surface as unhandled.
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

/**
 * Node Readable (ssh2 stdout/stderr) → web ReadableStream<Uint8Array>, with:
 * - backpressure: pause the source when the queue fills, resume in pull(), so a
 *   process that out-produces its consumer doesn't buffer unboundedly;
 * - cancellation: if the consumer cancels, destroy the source so ssh2 stops
 *   emitting.
 *
 * A single `done` latch makes the controller terminal-safe by construction: once
 * end/error/cancel fires, no further enqueue/close/error happens. ssh2 can emit
 * a `data` after `end`/`error`, and enqueuing on a settled controller throws —
 * so `data` both checks the latch and is wrapped, never throwing into ssh2's
 * emitter (which would surface as an uncaught error).
 */
export function nodeToWebStream(node: Readable): ReadableStream<Uint8Array> {
  let done = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      node.on("data", (d: Buffer) => {
        if (done) return;
        try {
          controller.enqueue(new Uint8Array(d));
        } catch {
          // Controller already closed/errored between the latch check and here —
          // stop reading rather than let the throw escape into ssh2's emitter.
          done = true;
          node.destroy();
          return;
        }
        // Negative desiredSize → the consumer is behind; stop pulling from ssh2
        // until pull() asks for more.
        if ((controller.desiredSize ?? 1) <= 0) node.pause();
      });
      node.on("end", () => {
        if (done) return;
        done = true;
        controller.close();
      });
      node.on("error", (e: Error) => {
        if (done) return;
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
    },
  });
}

/**
 * Spawn a long-running process over exec, returning eve's `SandboxProcess`:
 * live stdout/stderr streams, `wait()` for the exit code, `kill()`.
 *
 * Honors `abortSignal` (abort → kill the process AND make `wait()` reject with
 * the abort reason). env is inlined into `command` by the caller (see
 * `anchored`), not passed to the exec channel.
 */
function spawnOverSsh(
  conn: Client,
  command: string,
  options: { abortSignal?: AbortSignal | undefined } = {},
): Promise<{
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  wait: () => Promise<{ exitCode: number }>;
  kill: () => Promise<void>;
}> {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      resolve(buildSpawnedProcess(stream, options));
    });
  });
}

/** A spawned process's `SandboxProcess` surface (eve's contract). */
export interface SpawnedProcess {
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  wait: () => Promise<{ exitCode: number }>;
  kill: () => Promise<void>;
}

/**
 * Wrap a live exec channel as a `SandboxProcess`. Split out from the `conn.exec`
 * plumbing so the lifecycle (kill / wait / signal / abort / channel-error /
 * unhandled-rejection) is unit-testable with a fake channel (no live SSH).
 */
export function buildSpawnedProcess(
  stream: ClientChannel,
  options: { abortSignal?: AbortSignal | undefined } = {},
): SpawnedProcess {
  // kill() best-effort signals the channel, then closes it — many SSH gateways
  // (incl. Daytona's) ignore an exit-signal request, so closing the channel is
  // what actually tears the process down. Idempotent + never throws on an
  // already-closed channel.
  let killed = false;
  const kill = (): Promise<void> => {
    if (!killed) {
      killed = true;
      try {
        stream.signal("KILL");
        stream.close();
      } catch {
        // already closed — nothing to do
      }
    }
    return Promise.resolve();
  };

  // awaitCommand owns exit reconciliation AND abort precedence (it closes the
  // channel on abort and rejects with the reason, winning a same-tick exit), so
  // wait() is just a view of it. A caller may never call wait(), so attach a
  // benign handler too — a channel error must not become an unhandled rejection.
  const exit = awaitCommand(stream, options.abortSignal);
  exit.catch(() => {});
  const wait = (): Promise<{ exitCode: number }> =>
    exit.then(({ exitCode }) => ({ exitCode }));

  return {
    stdout: nodeToWebStream(stream),
    stderr: nodeToWebStream(stream.stderr),
    wait,
    kill,
  };
}


/** A lazily-connected SSH session plus lifecycle helpers for the backend. */
export interface SshSession {
  readonly session: SandboxSession;
  /** The provider sandbox id once known (after first provision), else `null`. */
  currentSandboxId(): string | null;
  /** Close the SSH connection (does NOT destroy the sandbox). */
  dispose(): void;
}

/**
 * Build an eve `SandboxSession`, lazily provisioning + connecting over SSH.
 *
 * `acquireAccess` mints fresh scoped access (the runtime's API call); it's
 * called on first use and again whenever the token has expired or the
 * connection dropped, so a long session keeps working past the token TTL. The
 * sandbox is provisioned only when a tool first calls `run` — never just to
 * open a session the agent might not use.
 */
export function sshSandboxSession(
  /** Stable id surfaced as `SandboxSession.id` (the eve session key). */
  id: string,
  acquireAccess: () => Promise<SshSandboxAccess>,
): SshSession {
  const resolvePath = (p: string): string => resolveSandboxPath(WORK_DIR, p);

  // The connection lifecycle (reuse / reconnect / re-mint / dispose) lives in
  // the manager; here we only wrap the real ssh2 `Client` as a ManagedConn.
  const manager = new SshConnectionManager<Client>({
    acquireAccess,
    expirySkewMs: EXPIRY_SKEW_MS,
    connect: async (access) => {
      const client = await connectSsh(access);
      return {
        client,
        end: () => client.end(),
        onClose: (cb) => void client.on("close", cb),
      };
    },
  });

  const session: SandboxSession = {
    id,
    resolvePath,

    async run({ command, workingDirectory, env, abortSignal }) {
      const c = (await manager.ensure()).client;
      // env is inlined into the command (see anchored), not the SSH env channel.
      return await runOverSsh(c, anchored(command, workingDirectory, env), { abortSignal });
    },

    async spawn({ command, workingDirectory, env, abortSignal }) {
      const c = (await manager.ensure()).client;
      return spawnOverSsh(c, anchored(command, workingDirectory, env), { abortSignal });
    },

    // --- file reads: resolve null when the file is absent (eve contract) ---
    // abortSignal is an UPFRONT check only: SFTP has no clean per-op cancel and
    // these ops are sub-second, so a mid-flight abort isn't honored (documented).
    async readBinaryFile({ path: p, abortSignal }) {
      throwIfAborted(abortSignal);
      const c = (await manager.ensure()).client;
      return await sftpReadBytes(c, resolvePath(p));
    },
    async readFile({ path: p, abortSignal }) {
      const bytes = await this.readBinaryFile({
        path: p,
        ...(abortSignal !== undefined ? { abortSignal } : {}),
      });
      return bytes === null ? null : bytesToStream(bytes);
    },
    async readTextFile({ path: p, encoding, startLine, endLine, abortSignal }) {
      const bytes = await this.readBinaryFile({
        path: p,
        ...(abortSignal !== undefined ? { abortSignal } : {}),
      });
      if (bytes === null) return null;
      const text = decodeText(bytes, encoding);
      // Line-range slicing is the AI-SDK's own extractLines (the exact impl eve
      // uses) — we don't reimplement it. No bounds → returns text unchanged.
      return startLine === undefined && endLine === undefined
        ? text
        : extractLines({
            text,
            ...(startLine !== undefined ? { startLine } : {}),
            ...(endLine !== undefined ? { endLine } : {}),
          });
    },

    // --- file writes: create parent dirs + overwrite (eve contract) ---
    async writeBinaryFile({ path: p, content, abortSignal }) {
      throwIfAborted(abortSignal);
      const c = (await manager.ensure()).client;
      await sftpWriteBytes(c, resolvePath(p), content);
    },
    async writeFile({ path: p, content, abortSignal }) {
      // Check before consuming the (possibly large) stream, and let an abort
      // mid-read cancel it rather than draining the whole thing first.
      throwIfAborted(abortSignal);
      const bytes = await streamToBytes(content, abortSignal);
      await this.writeBinaryFile({
        path: p,
        content: bytes,
        ...(abortSignal !== undefined ? { abortSignal } : {}),
      });
    },
    async writeTextFile({ path: p, content, encoding, abortSignal }) {
      await this.writeBinaryFile({
        path: p,
        content: encodeText(content, encoding),
        ...(abortSignal !== undefined ? { abortSignal } : {}),
      });
    },

    async removePath({ path: p, recursive, force, abortSignal }) {
      throwIfAborted(abortSignal);
      const c = (await manager.ensure()).client;
      await sftpRemovePath(c, resolvePath(p), { recursive, force });
    },

    // Network policy is a provision-time concern owned by the control plane, not
    // something the runtime sets per-session over SSH.
    setNetworkPolicy: () => {
      throw new Error(
        "zo sandbox: setNetworkPolicy() is not supported from the runtime — network policy is set when the control plane provisions the sandbox.",
      );
    },
  };

  return {
    session,
    currentSandboxId: () => manager.currentSandboxId(),
    dispose: () => manager.dispose(),
  };
}
