import path from "node:path";
import type { Client, SFTPWrapper } from "ssh2";
import { shellSingleQuote } from "./pure";
import { awaitCommand } from "./ssh-exec";

// File/process operations over an established ssh2 `Client`, backing the eve
// `SandboxSession` file methods + `spawn`. Byte transfer rides SFTP (binary-safe,
// no shell-escaping of content); directory creation and removal ride `exec`
// (SFTP has no recursive mkdir/rm). The session wraps these with the AI-SDK
// text/stream/encoding contract; this module stays bytes-and-paths.

/** SFTP status code for "no such file" (per the SFTP protocol). */
const SFTP_NO_SUCH_FILE = 2;

/**
 * Did an ssh2 SFTP error mean "the file doesn't exist"? (→ read methods return
 * null). ssh2 reliably sets `err.code` to the SFTP status code on the error, so
 * we match the code exactly rather than sniffing the message — a message-regex
 * would risk treating an unrelated failure as "absent".
 */
function isNoSuchFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === SFTP_NO_SUCH_FILE
  );
}

// One SFTP channel per connection, opened lazily and reused across operations —
// opening a fresh channel per read/write (and never closing it) leaks channels
// until the connection hits sshd's MaxSessions. Keyed by Client so it's scoped
// to the connection's life and GC'd with it; evicted on close/error so the next
// op reopens (e.g. after the connection manager reconnects with a new Client).
const sftpByClient = new WeakMap<Client, Promise<SFTPWrapper>>();

function getSftp(client: Client): Promise<SFTPWrapper> {
  const existing = sftpByClient.get(client);
  if (existing !== undefined) return existing;
  const opening = new Promise<SFTPWrapper>((resolve, reject) => {
    client.sftp((err, sftp) => {
      if (err) return reject(err);
      // Drop the cache entry if this channel dies, so we reopen next time.
      const evict = (): void => {
        if (sftpByClient.get(client) === opening) sftpByClient.delete(client);
      };
      sftp.on("close", evict).on("error", evict);
      resolve(sftp);
    });
  });
  // Don't cache a failed open.
  opening.catch(() => {
    if (sftpByClient.get(client) === opening) sftpByClient.delete(client);
  });
  sftpByClient.set(client, opening);
  return opening;
}

/**
 * Run a command to completion over exec, returning its exit code + stderr. Exit
 * reconciliation (signal→nonzero, so a killed mkdir/rm isn't a false 0, and
 * channel-error→reject so we never hang) is shared via awaitCommand.
 */
function exec(
  client: Client,
  command: string,
): Promise<{ exitCode: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    client.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stderr = "";
      stream.on("data", () => {}).stderr.on("data", (d: Buffer) => (stderr += d.toString()));
      awaitCommand(stream).then(
        ({ exitCode }) => resolve({ exitCode, stderr }),
        reject,
      );
    });
  });
}

/** Ensure a file's parent directory exists (SFTP can't mkdir -p). */
async function ensureParentDir(client: Client, filePath: string): Promise<void> {
  const dir = path.posix.dirname(filePath);
  if (dir === "" || dir === "." || dir === "/") return;
  const r = await exec(client, `mkdir -p ${shellSingleQuote(dir)}`);
  if (r.exitCode !== 0) {
    throw new Error(`sandbox: mkdir -p ${dir} failed (exit ${r.exitCode}): ${r.stderr.trim()}`);
  }
}

/** Read a file's bytes, or `null` if it doesn't exist. */
export async function sftpReadBytes(
  client: Client,
  remotePath: string,
): Promise<Uint8Array | null> {
  const sftp = await getSftp(client);
  return await new Promise<Uint8Array | null>((resolve, reject) => {
    sftp.readFile(remotePath, (err, buf) => {
      if (err) return isNoSuchFile(err) ? resolve(null) : reject(err);
      resolve(new Uint8Array(buf));
    });
  });
}

/** Write bytes to a file, creating parent dirs and overwriting any existing file. */
export async function sftpWriteBytes(
  client: Client,
  remotePath: string,
  bytes: Uint8Array,
): Promise<void> {
  await ensureParentDir(client, remotePath);
  const sftp = await getSftp(client);
  await new Promise<void>((resolve, reject) => {
    sftp.writeFile(remotePath, Buffer.from(bytes), (err) =>
      err ? reject(err) : resolve(),
    );
  });
}

/**
 * Remove a path. `recursive` allows non-empty dirs; `force` (→ `rm -f`) makes a
 * MISSING path a success. A non-zero exit is always an error: with `-f`, `rm`
 * itself already exits 0 for a missing path, so a remaining non-zero means a
 * real failure (permission denied, non-empty dir without `recursive`, …) we must
 * surface rather than swallow.
 */
export async function removePath(
  client: Client,
  remotePath: string,
  opts: { recursive?: boolean; force?: boolean } = {},
): Promise<void> {
  const flags = `${opts.recursive ? "r" : ""}${opts.force ? "f" : ""}`;
  const rm = flags === "" ? "rm" : `rm -${flags}`;
  const r = await exec(client, `${rm} ${shellSingleQuote(remotePath)}`);
  if (r.exitCode !== 0) {
    throw new Error(`sandbox: ${rm} ${remotePath} failed (exit ${r.exitCode}): ${r.stderr.trim()}`);
  }
}
