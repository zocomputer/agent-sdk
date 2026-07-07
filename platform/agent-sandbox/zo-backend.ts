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

      // The broker keys the session-partitioned `scratch` instance off the
      // `x-zo-eve-session` value VERBATIM, so every caller for one session must
      // send the SAME string. eve hands the backend TWO ids: `input.sessionKey`
      // is eve's WRAPPED internal key (`eve-sbx-ses-<backend>-<scope>-<sessionId>
      // -<nodeId>`), while `input.tags.sessionId` is the RAW eve session id
      // (`wrun_…`). The Save flush channel (apps/local-builder-agent's flush.ts)
      // only has the raw id and sends THAT, as does the git-remote/AgentWorkspace
      // path — so we must send the raw id here too, or the runtime and the flush
      // provision two separate sandboxes and Save promotes an empty seed tree
      // (see plans/rc2/builder-sandbox-key-mismatch.md). Fail loud if it's
      // absent rather than falling back to the wrapped key — a silent fallback
      // would re-introduce the split invisibly. Trim and reject blank/whitespace
      // too: `requestScratchSandboxAccess` trims and OMITS a blank
      // `x-zo-eve-session` header, so a whitespace-only id would otherwise slip
      // past this guard and fail later at the broker with `eve_session_required`
      // instead of this explicit create-time error.
      const eveSessionKey = input.tags?.sessionId?.trim();
      if (eveSessionKey === undefined || eveSessionKey.length === 0) {
        throw new Error(
          "zoBackend.create: eve did not supply a non-blank tags.sessionId (the raw session id the state broker partitions on)",
        );
      }

      // Resolve (or re-resolve) scoped SSH access from the control-plane state
      // broker — the `scratch` sandbox declaration for this eve session. Called
      // LAZILY on first `run` — so opening a session the agent never uses
      // provisions nothing — and again when the short-lived token expires or the
      // connection drops, so a long session keeps working.
      const acquireAccess = async (): Promise<SshSandboxAccess> =>
        await requestScratchSandboxAccess({
          apiBaseUrl: options.apiBaseUrl,
          eveSessionKey,
        });

      // `SandboxSession.id` is the raw eve session key too (same string the
      // flush uses), so the session surface is labelled by the id the broker
      // and the repo path both key on — not eve's wrapped internal key.
      const ssh = sshSandboxSession(eveSessionKey, acquireAccess);

      // No per-session options for MVP, so `use()` just yields the session.
      const useSessionFn = (): Promise<SandboxSession> => Promise.resolve(ssh.session);

      return Promise.resolve({
        session: ssh.session,
        useSessionFn,
        captureState: () =>
          Promise.resolve({
            backendName: BACKEND_NAME,
            // eve's own reconnect state — it matches a persisted handle by
            // `state.sessionKey === input.sessionKey`, so this MUST stay eve's
            // WRAPPED key (not the raw `eveSessionKey` we send the broker), or
            // reattach on reply silently misses and re-provisions.
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
