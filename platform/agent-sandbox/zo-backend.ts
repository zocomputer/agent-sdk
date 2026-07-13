import type {
  SandboxBackend,
  SandboxBackendCreateInput,
  SandboxBackendHandle,
  SandboxBackendPrewarmInput,
  SandboxSession,
} from "eve/sandbox";
import { type AmbientSessionParent, ambientSessionParent } from "./ambient";
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
// A SUBAGENT CHILD session keys the broker on its ROOT session's id instead
// (ambient lineage read — see the comment in `create`), so children share the
// parent conversation's sandbox rather than provisioning fresh ones.
// `dispose` closes the SSH connection but never destroys the sandbox — Daytona
// idles it out and the next reply reattaches. See
// plans/dcosson/external-state-sandbox.md and plans/rc2/sandbox-per-session.md.

/** Backend name; participates in eve's reconnect-state matching. */
const BACKEND_NAME = "zo";

export interface ZoBackendOptions {
  /** Control-plane API base URL the runtime calls (e.g. http://api.zo.localhost:4000). */
  readonly apiBaseUrl: string;
  /**
   * Injectable subagent-lineage read (tests); defaults to the real
   * context-storage read (`ambientSessionParent`).
   */
  readonly ambientParent?: () => AmbientSessionParent | null;
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

      // SUBAGENT LINEAGE: a subagent child session must share its ROOT
      // session's sandbox — eve always sets `tags.sessionId` to the CHILD's own
      // raw id, so keying the broker on it would provision a fresh, empty
      // sandbox per child (see plans/ben/subagent-shared-sandboxes.md). The
      // root id comes from eve's ambient context storage (`ParentSessionKey`),
      // read at TWO points because it's unverified whether `create` runs inside
      // eve's ALS scope:
      //   1. here at create time — resolves when eve invokes `create` in scope
      //      (the lazy `ctx.getSandbox()` inside a tool call);
      //   2. inside `acquireAccess` on the FIRST mint — `acquireAccess` runs
      //      lazily on the first `run`/file op, which is always inside a tool
      //      execute, where the ALS store demonstrably resolves (runtime-ai's
      //      `ambientEveSessionId` works there today).
      // The key is LATCHED on the first mint: every re-mint must present the
      // same broker key or a token refresh would silently hop the session to a
      // different sandbox — and even a failed mint may have provisioned
      // server-side (the broker find-or-creates the sandbox before minting SSH
      // access), so the latch covers the fallback key too, not just a resolved
      // lineage read. A lineage read that first resolves only AFTER a
      // fallback-keyed mint therefore does NOT flip the key. Absent both reads
      // (a root session, or no ALS) → fall back to `tags.sessionId`, today's
      // behavior, so nothing regresses.
      const readAmbientParent = options.ambientParent ?? ambientSessionParent;
      let lineageRootId: string | null = readAmbientParent()?.rootSessionId ?? null;
      let brokeredKey: string | null = null;
      const brokerSessionKey = (): string => {
        if (brokeredKey === null) {
          lineageRootId ??= readAmbientParent()?.rootSessionId ?? null;
          brokeredKey = lineageRootId ?? eveSessionKey;
        }
        return brokeredKey;
      };

      // Resolve (or re-resolve) scoped SSH access from the control-plane state
      // broker — the `scratch` sandbox declaration for this eve session (or its
      // root, when lineage resolves). Called LAZILY on first `run` — so opening
      // a session the agent never uses provisions nothing — and again when the
      // short-lived token expires or the connection drops, so a long session
      // keeps working.
      const acquireAccess = async (): Promise<SshSandboxAccess> =>
        await requestScratchSandboxAccess({
          apiBaseUrl: options.apiBaseUrl,
          eveSessionKey: brokerSessionKey(),
        });

      // `SandboxSession.id` is the raw eve session key the broker is keyed on
      // (same string the flush + git-remote paths use) — the CREATE-TIME
      // resolution, best effort: when lineage only resolves lazily (read point
      // 2 above) this label still says the child's id while the broker keys on
      // the root's. The broker key is what matters; the label is diagnostic.
      const ssh = sshSandboxSession(lineageRootId ?? eveSessionKey, acquireAccess);

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
            // `brokeredSessionKey` (lineage only) is diagnostic — recorded so a
            // persisted handle says which root key provisioned it; never read
            // back on reconnect (lineage re-resolves each create).
            metadata: {
              daytonaSandboxId: ssh.currentSandboxId() ?? rememberedId ?? "",
              ...(lineageRootId === null ? {} : { brokeredSessionKey: lineageRootId }),
            } satisfies DaytonaSessionMetadata,
          }),
        // Close the runtime-owned SSH connection on server shutdown. The
        // control plane owns the durable sandbox lifecycle, so the next server
        // process can reattach via the captured id.
        shutdown: () => {
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
