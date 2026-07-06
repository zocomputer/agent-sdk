import type {
  SandboxBackend,
  SandboxBackendCreateInput,
  SandboxBackendHandle,
  SandboxBackendPrewarmInput,
  SandboxSession,
} from "eve/sandbox";
import { requestScratchSandboxAccess } from "./api-client";
import { type SshSandboxAccess, sshSandboxSession } from "./ssh-session";
import { type DaytonaSessionMetadata, readSandboxId } from "./pure";

// The Zo sandbox backend for eve. It holds NO provider key: on `create` it
// resolves this session's `scratch` sandbox through the control-plane state
// broker (POST /state/handles) and gets back scoped SSH access, then connects
// over SSH. The default per-session sandbox is now the `scratch` external-state
// declaration (design-doc D10) — the same broker every other state uses. eve
// persists the sandbox id in its per-session metadata and hands it back as
// `existingMetadata` on a reply; the broker keys the session-partitioned
// instance off the eve session key, so a reply reattaches the same sandbox.
// `dispose` closes the SSH connection but never destroys the sandbox — Daytona
// idles it out and the next reply reattaches. See
// plans/dcosson/external-state-sandbox.md and plans/rc2/sandbox-per-session.md.

/** Backend name; participates in eve's reconnect-state matching. */
const BACKEND_NAME = "zo";

export interface ZoBackendOptions {
  /** Control-plane API base URL the runtime calls (e.g. http://api.zo.localhost:4000). */
  readonly apiBaseUrl: string;
}

export function zoBackend(options: ZoBackendOptions): SandboxBackend {
  return {
    name: BACKEND_NAME,

    // None of these await directly — the real I/O is the SSH connect/exec
    // inside `sshSandboxSession`'s lazily-called `acquireAccess`, plumbed
    // through as a callback rather than awaited here — so they return an
    // already-resolved Promise instead of using `async` with no `await`.
    create(input: SandboxBackendCreateInput): Promise<SandboxBackendHandle> {
      // The sandbox id eve remembered, if any — kept only for eve's own
      // reconnect state (captureState below). The API doesn't take it: it keys
      // this session's sandbox off the eve session key + caller's org itself.
      const rememberedId = readSandboxId(input.existingMetadata);

      // Resolve (or re-resolve) scoped SSH access from the control-plane state
      // broker — the `scratch` sandbox declaration for this eve session. Called
      // LAZILY on first `run` — so opening a session the agent never uses
      // provisions nothing — and again when the short-lived token expires or the
      // connection drops, so a long session keeps working.
      const acquireAccess = async (): Promise<SshSandboxAccess> =>
        await requestScratchSandboxAccess({
          apiBaseUrl: options.apiBaseUrl,
          eveSessionKey: input.sessionKey,
        });

      const ssh = sshSandboxSession(input.sessionKey, acquireAccess);

      // No per-session options for MVP, so `use()` just yields the session.
      const useSessionFn = (): Promise<SandboxSession> => Promise.resolve(ssh.session);

      return Promise.resolve({
        session: ssh.session,
        useSessionFn,
        captureState: () =>
          Promise.resolve({
            backendName: BACKEND_NAME,
            sessionKey: input.sessionKey,
            // The id we've provisioned this session, else the one eve remembered
            // (a session that never ran a command has nothing new to persist).
            metadata: {
              daytonaSandboxId: ssh.currentSandboxId() ?? rememberedId ?? "",
            } satisfies DaytonaSessionMetadata,
          }),
        // Close the local SSH connection; never destroy the sandbox (the next
        // reply reattaches via the captured id).
        dispose: () => {
          ssh.dispose();
          return Promise.resolve();
        },
      });
    },

    prewarm(_input: SandboxBackendPrewarmInput): Promise<{ reused: boolean }> {
      return Promise.resolve({ reused: false });
    },
  };
}
