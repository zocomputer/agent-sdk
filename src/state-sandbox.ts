/** Runtime client contract for external-state sandbox `exec` + `files` access. */

import { normalizeStateFilePath } from "./state-files";
import { parseConsentEnvelope, type StateConsentEnvelope } from "./state-consent-envelope";

/** Read-only or read-write access to a sandbox state instance. */
export type StateSandboxAccess = "r" | "rw";
/** The interface a state sandbox handle exposes: `exec` for shell commands, `files` for read/write. */
export type StateSandboxInterface = "exec" | "files";
/** The sandbox engine serving this state instance. Only Daytona is supported. */
export type StateSandboxEngine = "sandbox-daytona";
/** How state instances subdivide: unshared, team-scoped, user-scoped, or session-ephemeral. */
export type StateSandboxPartition = "none" | "team" | "user" | "session";
/** The sandbox lifecycle state when a handle is issued: ready to use or still resuming from hibernation. */
export type StateSandboxLifecycle = "ready" | "resuming";

/** API path for requesting a state sandbox handle from the runtime broker. */
export const STATE_SANDBOX_HANDLE_PATH = "/state/handles";
/** HTTP header for the agent's long-lived bearer token when requesting a sandbox handle. */
export const ZO_AGENT_TOKEN_HEADER = "x-zo-agent-token";
/** HTTP header for the eve session key when requesting a sandbox handle. */
export const ZO_EVE_SESSION_HEADER = "x-zo-eve-session";

/**
 * Short-lived SSH access for a broker-owned sandbox state instance.
 *
 * `sshUser` is a scoped bearer credential, not a human username; do not log full handles.
 */
export interface StateSandboxSshAccess {
  readonly sandboxId: string;
  readonly sshHost: string;
  readonly sshUser: string;
  readonly expiresAt: string;
}

/**
 * Broker response for a sandbox state instance.
 *
 * IDs, `partition`, `rootPath`, and `lifecycle` are safe for diagnostics. Treat `ssh` as a
 * bearer secret; it grants temporary access to the VM.
 */
export interface StateSandboxHandle {
  readonly handleId: string;
  readonly declarationName: string;
  readonly interface: StateSandboxInterface;
  readonly access: StateSandboxAccess;
  readonly engine: StateSandboxEngine;
  readonly storeId: string;
  readonly stateInstanceId: string;
  readonly partition: StateSandboxPartition;
  readonly sandboxResourceId: string;
  readonly rootPath: string;
  readonly lifecycle: StateSandboxLifecycle;
  readonly sandbox: StateSandboxSshAccess;
}

/**
 * Optional engine and partition defaults to suggest when requesting a sandbox handle.
 * The broker may ignore these; they influence zero-config binding, not enforcement.
 */
export interface StateSandboxSuggestedDefaults {
  readonly engine?: StateSandboxEngine;
  readonly partition?: StateSandboxPartition;
}

/**
 * The request body sent to the runtime broker when requesting a state sandbox handle.
 * Names the state declaration and specifies required interface, access, and suggested defaults.
 */
export interface StateSandboxHandleRequest {
  readonly declarationName: string;
  readonly interface: StateSandboxInterface;
  readonly access: StateSandboxAccess;
  readonly suggestedDefaults: StateSandboxSuggestedDefaults;
}

/**
 * Fetch-compatible HTTP client for requesting sandbox handles.
 * Accepts the same signature as global `fetch`.
 */
export interface StateSandboxHandleFetch {
  (input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

/**
 * Headers as a `Headers` object, tuple array, or string-keyed record.
 * Compatible with the `fetch` API's `HeadersInit`.
 */
export type StateSandboxHeadersInit =
  | Headers
  | ReadonlyArray<readonly [string, string]>
  | Readonly<Record<string, string>>;

/**
 * Options for requesting a state sandbox handle from the runtime broker.
 * Specifies the HTTP client, API base URL, state declaration details, and optional auth credentials.
 */
export interface RequestStateSandboxHandleOptions {
  readonly fetch: StateSandboxHandleFetch;
  readonly apiBaseUrl: string | URL;
  readonly declarationName: string;
  readonly interface: StateSandboxInterface;
  readonly access: StateSandboxAccess;
  /** Agent bearer token sent to the runtime broker as `x-zo-agent-token`. */
  readonly agentToken?: string;
  /** eve session key sent as `x-zo-eve-session`; the route derives resolver session identity from auth context. */
  readonly eveSessionKey?: string;
  /**
   * Declaration defaults from `defineExternalState`. The sandbox client sends
   * `engine: "sandbox-daytona"` by default so unbound exec declarations do
   * not fall through to the broker's R2 zero-config default.
   */
  readonly suggestedDefaults?: StateSandboxSuggestedDefaults;
  /** Extra headers; cannot override the SDK-managed content type or Zo auth headers. */
  readonly headers?: StateSandboxHeadersInit;
}

/**
 * Error thrown when a state sandbox handle request fails.
 * Carries the HTTP status and an optional error code from the broker.
 */
export class StateSandboxHandleError extends Error {
  readonly status: number;
  readonly code: string | null;
  /**
   * The consent envelope, present ONLY on a `consent_required` 409 carrying the
   * full contract (bindingId, declarationName, resourceName, party); `null`
   * otherwise. The `@zo/state` consent wrapper reads it to steer the model.
   */
  readonly consent: StateConsentEnvelope | null;

  constructor(
    message: string,
    options: { status: number; code?: string | null; consent?: StateConsentEnvelope | null },
  ) {
    super(message);
    this.name = "StateSandboxHandleError";
    this.status = options.status;
    this.code = options.code ?? null;
    this.consent = options.consent ?? null;
  }
}

/**
 * Requests a state sandbox handle from the runtime broker.
 * Throws `StateSandboxHandleError` if the request fails or the response is malformed.
 */
export async function requestStateSandboxHandle(
  options: RequestStateSandboxHandleOptions,
): Promise<StateSandboxHandle> {
  const response = await options.fetch(
    buildStateSandboxHandleUrl(options.apiBaseUrl),
    {
      method: "POST",
      headers: buildStateSandboxHandleHeaders(options),
      body: JSON.stringify(buildStateSandboxHandleRequest(options)),
    },
  );
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = parseStateSandboxBrokerError(json);
    throw new StateSandboxHandleError(error.message, {
      status: response.status,
      code: error.code,
      consent: error.code === "consent_required" ? parseConsentEnvelope(json) : null,
    });
  }
  const handle = parseStateSandboxHandle(json);
  if (handle === null) {
    throw new StateSandboxHandleError(
      "state sandbox broker returned a malformed handle",
      {
        status: response.status,
        code: "malformed_handle",
      },
    );
  }
  return handle;
}

/**
 * Parses a runtime broker response into a `StateSandboxHandle`.
 * Returns `null` if the shape is invalid or required fields are missing.
 */
export function parseStateSandboxHandle(
  value: unknown,
): StateSandboxHandle | null {
  if (!isRecord(value)) {
    return null;
  }
  const access = parseStateSandboxAccess(value.access);
  const iface = parseStateSandboxInterface(value.interface);
  const partition = parseStateSandboxPartition(value.partition);
  const lifecycle = parseStateSandboxLifecycle(value.lifecycle ?? value.status);
  const sandbox = parseStateSandboxSshAccess(
    value.sandbox ?? value.ssh ?? value.accessHandle ?? value.sshAccess,
  );
  if (
    access === null ||
    iface === null ||
    partition === null ||
    lifecycle === null ||
    sandbox === null ||
    value.engine !== "sandbox-daytona"
  ) {
    return null;
  }
  const handleId = readString(value, "handleId");
  const declarationName = readString(value, "declarationName");
  const storeId = readString(value, "storeId");
  const stateInstanceId = readString(value, "stateInstanceId");
  const sandboxResourceId = readString(value, "sandboxResourceId");
  const rootPath = readString(value, "rootPath");
  if (
    handleId === null ||
    declarationName === null ||
    storeId === null ||
    stateInstanceId === null ||
    sandboxResourceId === null ||
    rootPath === null ||
    !rootPath.startsWith("/")
  ) {
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
    sandbox,
  });
}

/**
 * Options for running a command in a state sandbox.
 * Specifies working directory, environment variables, and an optional abort signal.
 */
export interface StateSandboxRunOptions {
  readonly workingDirectory?: string;
  /** Extra env for this command. Ambient process env is never read implicitly. */
  readonly env?: Readonly<Record<string, string>>;
  readonly abortSignal?: AbortSignal;
}

/**
 * The result of running a shell command in a state sandbox.
 * Contains exit code, stdout, and stderr as UTF-8 strings.
 */
export interface StateSandboxRunResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * A running process spawned in a state sandbox.
 * Provides streaming stdout/stderr and a promise that resolves to the exit code.
 */
export interface StateSandboxSpawnedProcess {
  readonly stdout: AsyncIterable<Uint8Array>;
  readonly stderr: AsyncIterable<Uint8Array>;
  readonly exitCode: Promise<number>;
  /** Kills the process with an optional signal (e.g. `"SIGTERM"`, `"SIGKILL"`). */
  kill(signal?: string): Promise<void> | void;
}

/**
 * The low-level sandbox session interface that exec/spawn and file I/O operations run over.
 * Implemented by SSH-backed or mock sandbox sessions.
 */
export interface StateSandboxSessionLike {
  /** Runs a shell command to completion and returns stdout, stderr, and exit code. */
  run(options: {
    readonly command: string;
    readonly workingDirectory?: string;
    readonly env?: Readonly<Record<string, string>>;
    readonly abortSignal?: AbortSignal;
  }): PromiseLike<StateSandboxRunResult>;
  /** Spawns a shell command and returns a handle to the running process with streaming output. */
  spawn(options: {
    readonly command: string;
    readonly workingDirectory?: string;
    readonly env?: Readonly<Record<string, string>>;
    readonly abortSignal?: AbortSignal;
  }): PromiseLike<StateSandboxSpawnedProcess>;
  /** Reads a file as binary. Returns `null` if the file does not exist. */
  readBinaryFile(options: {
    readonly path: string;
  }): PromiseLike<Uint8Array | null>;
  /** Writes a file as binary, creating parent directories if needed. */
  writeBinaryFile(options: {
    readonly path: string;
    readonly content: Uint8Array;
  }): PromiseLike<void>;
  /** Removes a file or directory. */
  removePath(options: {
    readonly path: string;
    readonly recursive?: boolean;
    readonly force?: boolean;
  }): PromiseLike<void>;
  /** Cleans up the session, closing any open connections. */
  dispose?(): PromiseLike<void> | void;
}

/**
 * Factory function that creates a sandbox session from a handle.
 * Typically implemented by an SSH client that connects to the sandbox's access credentials.
 */
export interface StateSandboxSessionFactory {
  (handle: StateSandboxHandle): PromiseLike<StateSandboxSessionLike>;
}

/**
 * High-level file I/O client for a state sandbox.
 * Paths are relative to the sandbox's root; the client resolves them automatically.
 */
export interface StateSandboxFilesClient {
  /** Reads a file as binary. Returns `null` if the file does not exist. */
  read(path: string): Promise<Uint8Array | null>;
  /** Writes a file from a UTF-8 string or binary content, creating parent directories if needed. */
  write(path: string, content: string | Uint8Array): Promise<void>;
  /** Deletes a file or directory. */
  delete(
    path: string,
    options?: { readonly recursive?: boolean; readonly force?: boolean },
  ): Promise<void>;
}

/**
 * The lifecycle state of a sandbox client: idle (no handle loaded), resuming (handle loaded but sandbox still waking), or ready.
 * Transitions from idle to resuming when a handle is requested, then to ready once the session establishes.
 */
export type StateSandboxStatus =
  | { readonly status: "idle" }
  | { readonly status: "resuming"; readonly handleId: string }
  | { readonly status: "ready"; readonly handleId: string };

/**
 * High-level client for a state sandbox with automatic handle renewal and session caching.
 * Exposes exec, spawn, and file I/O; manages the underlying session lifecycle transparently.
 */
export interface StateSandboxClient {
  readonly files: StateSandboxFilesClient;
  /** Returns the current lifecycle state of the client. */
  status(): StateSandboxStatus;
  /** Runs a shell command to completion in the sandbox. Requires `rw` access. */
  exec(
    command: string,
    options?: StateSandboxRunOptions,
  ): Promise<StateSandboxRunResult>;
  /** Spawns a long-running shell command with streaming output. Requires `rw` access. */
  spawn(
    command: string,
    options?: StateSandboxRunOptions,
  ): Promise<StateSandboxSpawnedProcess>;
  /** Disposes the client, closing the underlying session and any pending operations. */
  dispose(): Promise<void>;
}

/**
 * Options for creating a sandbox client with automatic handle renewal and session caching.
 * The client calls `loadHandle` when the handle expires or on first use, then builds a session via `createSession`.
 */
export interface CreateStateSandboxClientOptions {
  /** Loads a fresh sandbox handle, typically by calling `requestStateSandboxHandle`. */
  readonly loadHandle: () => Promise<StateSandboxHandle>;
  /** Creates a session from a handle, typically an SSH client connection. */
  readonly createSession: StateSandboxSessionFactory;
  /** Returns the current time for expiry checks. Defaults to `() => new Date()`. */
  readonly now?: () => Date;
  /** Reload the handle and rebuild the session when it expires within this window. Defaults to 60 seconds. */
  readonly refreshWindowMs?: number;
  /**
   * Ambient runtime env a caller wants to preserve for session-scratch exec.
   * Durable/shared handles (`team`, `user`, `none`) never receive it.
   */
  readonly ambientEnv?: Readonly<Record<string, string>>;
  /**
   * Session-partitioned scratch is the only state class allowed to inherit ambient env.
   * Defaults to false so durable state clients are clean-env by construction.
   */
  readonly passAmbientEnvToSessionPartition?: boolean;
}

/**
 * Creates a sandbox client that automatically renews its handle and caches the underlying session.
 * Manages handle expiry, session disposal, and request queuing transparently.
 */
export function createStateSandboxClient(
  options: CreateStateSandboxClientOptions,
): StateSandboxClient {
  const now = options.now ?? (() => new Date());
  const refreshWindowMs = options.refreshWindowMs ?? 60_000;
  interface CachedStateSandboxSession {
    readonly handle: StateSandboxHandle;
    readonly session: StateSandboxSessionLike;
    activeUses: number;
    disposeWhenIdle: boolean;
  }
  let cached: CachedStateSandboxSession | null = null;
  let pending: Promise<CachedStateSandboxSession> | null = null;
  let pendingLeaseWaiters = 0;
  let status: StateSandboxStatus = { status: "idle" };

  async function disposeCachedSession(
    record: CachedStateSandboxSession,
    options: { readonly waitForPendingLeases?: boolean } = {},
  ): Promise<void> {
    if (
      record.activeUses > 0 ||
      (options.waitForPendingLeases === true && pendingLeaseWaiters > 0)
    ) {
      record.disposeWhenIdle = true;
      return;
    }
    if (cached === record) {
      cached = null;
    }
    await record.session.dispose?.();
  }

  async function releaseCachedSession(
    record: CachedStateSandboxSession,
  ): Promise<void> {
    record.activeUses -= 1;
    if (record.activeUses === 0 && record.disposeWhenIdle) {
      await disposeCachedSession(record);
    }
  }

  function ensureSession(): Promise<CachedStateSandboxSession> {
    const current = cached;
    if (
      current !== null &&
      !shouldRefreshStateSandboxHandle(current.handle, now(), refreshWindowMs)
    ) {
      return Promise.resolve(current);
    }
    if (pending !== null) return pending;

    const previous = cached;
    pending = (async () => {
      try {
        const handle = await options.loadHandle();
        if (handle.lifecycle === "resuming") {
          status = { status: "resuming", handleId: handle.handleId };
        }
        const session = await options.createSession(handle);
        const next: CachedStateSandboxSession = {
          handle,
          session,
          activeUses: 0,
          disposeWhenIdle: false,
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

  async function leaseSession(): Promise<{
    handle: StateSandboxHandle;
    session: StateSandboxSessionLike;
    release: () => Promise<void>;
  }> {
    const sessionPromise = ensureSession();
    pendingLeaseWaiters += 1;
    let record: CachedStateSandboxSession;
    try {
      record = await sessionPromise;
    } finally {
      pendingLeaseWaiters -= 1;
    }
    record.activeUses += 1;
    return {
      handle: record.handle,
      session: record.session,
      release: () => releaseCachedSession(record),
    };
  }

  function buildRemotePath(handle: StateSandboxHandle, path: string): string {
    return `${handle.rootPath}/${normalizeStateFilePath(path)}`;
  }

  function workingDirectoryFor(
    handle: StateSandboxHandle,
    explicit: string | undefined,
  ): string {
    return explicit === undefined
      ? handle.rootPath
      : buildRemotePath(handle, explicit);
  }

  function commandEnv(
    handle: StateSandboxHandle,
    explicit: Readonly<Record<string, string>> | undefined,
  ): Readonly<Record<string, string>> | undefined {
    const base =
      options.passAmbientEnvToSessionPartition === true &&
      handle.partition === "session"
        ? options.ambientEnv
        : undefined;
    if (base === undefined) {
      return explicit;
    }
    if (explicit === undefined) {
      return base;
    }
    return { ...base, ...explicit };
  }

  function maybeEnv(
    handle: StateSandboxHandle,
    explicit: Readonly<Record<string, string>> | undefined,
  ): { readonly env?: Readonly<Record<string, string>> } {
    const env = commandEnv(handle, explicit);
    return env === undefined ? {} : { env };
  }

  async function withSession<T>(
    use: (resolved: {
      handle: StateSandboxHandle;
      session: StateSandboxSessionLike;
    }) => Promise<T>,
  ): Promise<T> {
    const resolved = await leaseSession();
    try {
      return await use(resolved);
    } finally {
      await resolved.release();
    }
  }

  async function withWriteSession<T>(
    use: (resolved: {
      handle: StateSandboxHandle;
      session: StateSandboxSessionLike;
    }) => Promise<T>,
  ): Promise<T> {
    return await withSession(async (resolved) => {
      if (resolved.handle.access !== "rw") {
        throw new Error(
          `state sandbox handle "${resolved.handle.handleId}" is read-only`,
        );
      }
      return await use(resolved);
    });
  }

  return {
    files: {
      async read(path) {
        return await withSession(
          async ({ handle, session }) =>
            await session.readBinaryFile({
              path: buildRemotePath(handle, path),
            }),
        );
      },
      async write(path, content) {
        await withWriteSession(async ({ handle, session }) => {
          const bytes =
            typeof content === "string"
              ? new TextEncoder().encode(content)
              : content;
          await session.writeBinaryFile({
            path: buildRemotePath(handle, path),
            content: bytes,
          });
        });
      },
      async delete(path, deleteOptions) {
        await withWriteSession(async ({ handle, session }) => {
          await session.removePath({
            path: buildRemotePath(handle, path),
            ...(deleteOptions?.recursive === undefined
              ? {}
              : { recursive: deleteOptions.recursive }),
            ...(deleteOptions?.force === undefined
              ? {}
              : { force: deleteOptions.force }),
          });
        });
      },
    },
    status: () => status,
    async exec(command, runOptions) {
      return await withWriteSession(
        async ({ handle, session }) =>
          await session.run({
            command,
            workingDirectory: workingDirectoryFor(
              handle,
              runOptions?.workingDirectory,
            ),
            ...maybeEnv(handle, runOptions?.env),
            ...(runOptions?.abortSignal === undefined
              ? {}
              : { abortSignal: runOptions.abortSignal }),
          }),
      );
    },
    async spawn(command, runOptions) {
      return await withWriteSession(
        async ({ handle, session }) =>
          await session.spawn({
            command,
            workingDirectory: workingDirectoryFor(
              handle,
              runOptions?.workingDirectory,
            ),
            ...maybeEnv(handle, runOptions?.env),
            ...(runOptions?.abortSignal === undefined
              ? {}
              : { abortSignal: runOptions.abortSignal }),
          }),
      );
    },
    async dispose() {
      const resolved = pending === null ? cached : await pending;
      if (resolved !== null) {
        await disposeCachedSession(resolved, { waitForPendingLeases: true });
      }
      status = { status: "idle" };
    },
  };
}

/**
 * Checks whether a sandbox handle should be refreshed based on its SSH access expiry.
 * Returns `true` if the handle expires within the refresh window or has an invalid expiry timestamp.
 */
export function shouldRefreshStateSandboxHandle(
  handle: StateSandboxHandle,
  now: Date,
  refreshWindowMs = 60_000,
): boolean {
  const expiresAtMs = Date.parse(handle.sandbox.expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    return true;
  }
  return expiresAtMs - now.getTime() <= refreshWindowMs;
}

function buildStateSandboxHandleRequest(
  options: RequestStateSandboxHandleOptions,
): StateSandboxHandleRequest {
  return {
    declarationName: options.declarationName,
    interface: options.interface,
    access: options.access,
    suggestedDefaults: {
      ...options.suggestedDefaults,
      engine: options.suggestedDefaults?.engine ?? "sandbox-daytona",
    },
  };
}

function buildStateSandboxHandleUrl(apiBaseUrl: string | URL): string {
  const url = new URL(String(apiBaseUrl));
  url.pathname = joinUrlPath(url.pathname, STATE_SANDBOX_HANDLE_PATH);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function joinUrlPath(basePath: string, childPath: string): string {
  const base = basePath.replace(/\/+$/, "");
  const child = childPath.replace(/^\/+/, "");
  return `${base}/${child}`;
}

function buildStateSandboxHandleHeaders(
  options: RequestStateSandboxHandleOptions,
): Headers {
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

function createHeaders(init: StateSandboxHeadersInit | undefined): Headers {
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

function parseStateSandboxBrokerError(value: unknown): {
  message: string;
  code: string | null;
} {
  if (!isRecord(value)) {
    return { message: "state sandbox broker request failed", code: null };
  }
  const routeError = readString(value, "error");
  if (routeError !== null) {
    return {
      message:
        readString(value, "message") ?? "state sandbox broker request failed",
      code: routeError,
    };
  }
  const error = isRecord(value.error) ? value.error : value;
  const message =
    readString(error, "message") ?? "state sandbox broker request failed";
  const code = readString(error, "code") ?? readString(error, "error");
  return { message, code };
}

function parseStateSandboxSshAccess(
  value: unknown,
): StateSandboxSshAccess | null {
  if (!isRecord(value)) {
    return null;
  }
  const sandboxId = readString(value, "sandboxId");
  const sshHost = readString(value, "sshHost");
  const sshUser = readString(value, "sshUser");
  const expiresAt = readString(value, "expiresAt");
  if (
    sandboxId === null ||
    sshHost === null ||
    sshUser === null ||
    expiresAt === null ||
    !Number.isFinite(Date.parse(expiresAt))
  ) {
    return null;
  }
  return Object.freeze({ sandboxId, sshHost, sshUser, expiresAt });
}

function parseStateSandboxPartition(
  value: unknown,
): StateSandboxPartition | null {
  if (
    value === "none" ||
    value === "team" ||
    value === "user" ||
    value === "session"
  ) {
    return value;
  }
  return null;
}

function parseStateSandboxAccess(value: unknown): StateSandboxAccess | null {
  if (value === "r" || value === "rw") {
    return value;
  }
  return null;
}

function parseStateSandboxInterface(
  value: unknown,
): StateSandboxInterface | null {
  if (value === "exec" || value === "files") {
    return value;
  }
  return null;
}

function parseStateSandboxLifecycle(
  value: unknown,
): StateSandboxLifecycle | null {
  if (value === "ready" || value === undefined || value === null) {
    return "ready";
  }
  if (value === "resuming") {
    return "resuming";
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
