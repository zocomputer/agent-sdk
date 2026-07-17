// @zocomputer/agent-sandbox — the Zo built-in sandbox for eve agents.
//
// Agents author against `zoSandbox()` and never name the provider; the runtime
// never holds the Daytona key — it asks the Zo control plane (apps/api) to
// provision its sandbox and connects over SSH with a scoped token. `zoBackend()`
// is exported for callers that want the raw eve `SandboxBackend` directly.

export { zoSandbox, type ZoSandboxOptions } from "./zo-sandbox";
export { zoBackend, type ZoBackendOptions } from "./zo-backend";

// The declaration-bound sandbox runtime: open a DECLARED external-state
// sandbox (`agent/state/<name>.ts`) from authored code — broker resolution,
// ambient Eve identity latching, and the SSH transport composed behind the
// standard `StateSandboxClient` contract.
export { zoStateSandbox, type ZoStateSandboxOptions } from "./state-client";

// The connect-a-sandbox-by-eve-session-key primitives `zoBackend` composes
// internally, exported for a caller that needs a standalone `SandboxSession`
// OUTSIDE eve's own ALS-scoped tool/hook context — e.g. an eve channel HTTP
// route, which gets no `ctx.getSandbox()` (see the Builder's `agent/channels/
// flush.ts`, plans/sachin/code-storage-phase3-implementation.md).
export {
  requestScratchSandboxAccess,
  SandboxBrokerError,
  SandboxConsentRequiredError,
  type SandboxConsentEnvelope,
  type FetchLike,
  type RequestSandboxInput,
  type SandboxSessionResponse,
} from "./api-client";
export {
  sshSandboxSession,
  type SshSandboxAccess,
  type SshSession,
} from "./ssh-session";
