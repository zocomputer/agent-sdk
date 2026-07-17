import type { ExternalStateDeclaration } from "../../src/state.ts";
import {
  createStateSandboxClient,
  requestStateSandboxHandle,
  type StateSandboxClient,
  type StateSandboxHandle,
  type StateSandboxHandleFetch,
  type StateSandboxSessionFactory,
  type StateSandboxSessionLike,
  type StateSandboxSpawnedProcess,
} from "../../src/state-sandbox.ts";
import { AGENT_TOKEN_ENV } from "../runtime-auth/index.ts";
import {
  type AmbientSessionParent,
  ambientEveSessionId,
  ambientSessionCapability,
  ambientSessionParent,
} from "./ambient";
import { sshSandboxSession } from "./ssh-session";
import type { SshSandboxAccess } from "./ssh-connection";

// The declaration-bound sandbox runtime — the composed surface authored agent
// code opens a DECLARED sandbox with, without hand-wiring the broker request,
// ambient Eve identity, or the SSH client (plans/erik/
// external-state-sandbox-completion-plan.md U2). Layering (KTD3/KTD4): the
// declaration module (`@zocomputer/agent-sdk/state`) stays dependency-free and
// statically parseable; the low-level handle/client contract lives in
// `@zocomputer/agent-sdk/state-sandbox`; THIS module owns the composition —
// ambient reads + latches (the `zo-backend.ts` idiom) + the ssh2 transport —
// so importing a declaration never loads SSH or Eve context code, and the
// import direction (agent-sandbox → agent-sdk) stays acyclic in-workspace and
// rewrites to a relative path in the published fat SDK.

/** Where the runtime reaches the control plane. Same default as `zo-sandbox.ts`. */
const DEFAULT_API_URL = "http://api.zo.localhost:4000";

/** Options for a declaration-bound sandbox client. Everything is injectable for tests. */
export interface ZoStateSandboxOptions {
  /** Control-plane API base URL. Defaults to `ZO_API_URL` or the dev parity host. */
  readonly apiBaseUrl?: string;
  /** Injectable fetch (tests); defaults to global fetch. */
  readonly fetch?: StateSandboxHandleFetch;
  /** Agent bearer token; defaults to `process.env[AGENT_TOKEN_ENV]` at mint time. */
  readonly agentToken?: string;
  /** Injectable subagent-lineage read (tests); defaults to the real ambient read. */
  readonly ambientParent?: () => AmbientSessionParent | null;
  /** Injectable current-session read (tests); defaults to the real ambient read. */
  readonly ambientSessionId?: () => string | null;
  /** Injectable trusted-channel capability read (tests); defaults to the real ambient read. */
  readonly ambientCapability?: () => string | undefined;
  /**
   * Ambient runtime env to preserve for session-scratch exec. Honored ONLY for
   * the canonical `scratch` declaration on a session-partitioned handle (R7:
   * only session scratch may opt into ambient env); every other declaration
   * gets a clean environment regardless of this option.
   */
  readonly ambientEnv?: Readonly<Record<string, string>>;
  /** Test seam: build a session from a handle instead of connecting over SSH. */
  readonly createSession?: StateSandboxSessionFactory;
  /** Injectable clock for handle-refresh checks (tests). */
  readonly now?: () => Date;
  /** Reload the handle when it expires within this window. Defaults to 60s. */
  readonly refreshWindowMs?: number;
}

/** The one declaration allowed to opt into ambient env (R7 / D10). */
const SCRATCH_DECLARATION_NAME = "scratch";

/**
 * Open a declared external-state sandbox from authored agent code.
 *
 * ```ts
 * import workspace from "../state/workspace";
 * const sandbox = zoStateSandbox(workspace);
 * const result = await sandbox.exec("ls -la");
 * ```
 *
 * The declaration (the default export of `agent/state/<name>.ts`) is the
 * source of the name, interface, access, and suggested defaults; this factory
 * resolves the control-plane binding via `POST /state/handles`, latches the
 * ambient Eve identity (a nested subagent uses its ROOT session's id; the
 * first resolved session key and trusted-channel capability stay latched
 * across handle renewal, the `zoSandbox()` refresh contract), connects over
 * SSH with the scoped short-lived token, and returns the standard
 * `StateSandboxClient` — exec, spawn, and root-scoped file I/O.
 *
 * Only `exec` and `files` declarations are sandbox-backed; `sql`/`http`
 * declarations throw here rather than producing a client that cannot resolve.
 */
export function zoStateSandbox(
  declaration: ExternalStateDeclaration,
  options: ZoStateSandboxOptions = {},
): StateSandboxClient {
  if (declaration.interface !== "exec" && declaration.interface !== "files") {
    throw new Error(
      `zoStateSandbox: declaration "${declaration.name}" has interface "${declaration.interface}" — only "exec" and "files" declarations are sandbox-backed`,
    );
  }
  const iface = declaration.interface;
  const readAmbientParent = options.ambientParent ?? ambientSessionParent;
  const readAmbientSessionId = options.ambientSessionId ?? ambientEveSessionId;
  const readAmbientCapability = options.ambientCapability ?? ambientSessionCapability;

  // LATCHES (the zo-backend.ts idiom): the broker partitions session instances
  // on the eve-session header verbatim and resolves user/team partitions from
  // the capability, so every re-mint for one client must present the SAME
  // identity — a token-expiry renewal that resolved a different session key or
  // dropped the capability would silently hop the client to a different
  // instance (or fail closed). The first RESOLVED value latches; a read that
  // first resolves only after an unresolved mint does latch then (an absent
  // session key never provisions server-side — the broker rejects before
  // instance work — so re-resolving until one appears cannot hop instances).
  let latchedSessionKey: string | null =
    readAmbientParent()?.rootSessionId ?? readAmbientSessionId();
  const brokerSessionKey = (): string | null => {
    latchedSessionKey ??= readAmbientParent()?.rootSessionId ?? readAmbientSessionId();
    return latchedSessionKey;
  };
  let latchedCapability: string | undefined = readAmbientCapability();
  const brokerSessionCapability = (): string | undefined => {
    latchedCapability ??= readAmbientCapability();
    return latchedCapability;
  };

  const loadHandle = async (): Promise<StateSandboxHandle> => {
    const sessionKey = brokerSessionKey();
    const sessionCapability = brokerSessionCapability();
    const agentToken = (options.agentToken ?? process.env[AGENT_TOKEN_ENV])?.trim() || undefined;
    return await requestStateSandboxHandle({
      fetch: options.fetch ?? fetch,
      apiBaseUrl: options.apiBaseUrl ?? process.env.ZO_API_URL ?? DEFAULT_API_URL,
      declarationName: declaration.name,
      interface: iface,
      access: declaration.access,
      ...(agentToken === undefined ? {} : { agentToken }),
      ...(sessionKey === null ? {} : { eveSessionKey: sessionKey }),
      ...(sessionCapability === undefined ? {} : { sessionCapability }),
      suggestedDefaults: {
        engine: "sandbox-daytona",
        ...(declaration.suggestedDefaults?.partition === undefined
          ? {}
          : { partition: declaration.suggestedDefaults.partition }),
        ...(declaration.suggestedDefaults?.lifecycle === undefined
          ? {}
          : { lifecycle: declaration.suggestedDefaults.lifecycle }),
      },
    });
  };

  return createStateSandboxClient({
    loadHandle,
    // The default SSH factory gets `loadHandle` as its re-mint path so the
    // inner connection manager can fetch fresh scoped credentials on a late
    // reconnect (post-TTL socket drop / revoked token) instead of replaying
    // the handle's original token.
    createSession: options.createSession ?? ((handle) => sshStateSession(handle, loadHandle)),
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.refreshWindowMs === undefined
      ? {}
      : { refreshWindowMs: options.refreshWindowMs }),
    ...(options.ambientEnv === undefined ? {} : { ambientEnv: options.ambientEnv }),
    // R7: ambient env may reach a session-partitioned handle ONLY for the
    // canonical scratch declaration; the client additionally gates on the
    // handle's actual partition, so both conditions must hold.
    passAmbientEnvToSessionPartition:
      declaration.name === SCRATCH_DECLARATION_NAME && options.ambientEnv !== undefined,
  });
}

/**
 * The default session factory: connect to the handle's sandbox over SSH with
 * the scoped token and adapt the eve `SandboxSession` surface to the
 * `StateSandboxSessionLike` contract. One session per handle: the outer client
 * renews the handle before token expiry and disposes the old session, and the
 * inner connection manager reuses/reconnects within the handle's lifetime.
 * `remint` backs the manager's re-mint path: a reconnect AFTER the ~10-minute
 * scoped token expired (a socket drop mid-work, a revoked token on a sandbox
 * restart) must fetch fresh credentials through the broker — handing back the
 * handle's original token would fail every late reconnect.
 */
function sshStateSession(
  handle: StateSandboxHandle,
  remint?: () => Promise<StateSandboxHandle>,
): Promise<StateSandboxSessionLike> {
  const initialAccess: SshSandboxAccess = {
    sandboxId: handle.sandbox.sandboxId,
    sshHost: handle.sandbox.sshHost,
    sshUser: handle.sandbox.sshUser,
    expiresAt: handle.sandbox.expiresAt,
  };
  let mintedInitial = false;
  const acquireAccess = async (): Promise<SshSandboxAccess> => {
    if (!mintedInitial) {
      mintedInitial = true;
      return initialAccess;
    }
    if (remint === undefined) return initialAccess;
    const fresh = await remint();
    return {
      sandboxId: fresh.sandbox.sandboxId,
      sshHost: fresh.sandbox.sshHost,
      sshUser: fresh.sandbox.sshUser,
      expiresAt: fresh.sandbox.expiresAt,
    };
  };
  const ssh = sshSandboxSession(handle.stateInstanceId, acquireAccess);
  const session: StateSandboxSessionLike = {
    async run(runOptions) {
      return await ssh.session.run(runOptions);
    },
    async spawn(spawnOptions) {
      const process = await ssh.session.spawn(spawnOptions);
      const exitCode = Promise.resolve(process.wait()).then(({ exitCode: code }) => code);
      // A caller may only consume stdout/stderr and never await exitCode; a
      // channel error must not become an unhandled rejection (the
      // buildSpawnedProcess idiom).
      exitCode.catch(() => {});
      const spawned: StateSandboxSpawnedProcess = {
        stdout: process.stdout,
        stderr: process.stderr,
        exitCode,
        kill: () => Promise.resolve(process.kill()),
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
    },
  };
  return Promise.resolve(session);
}
