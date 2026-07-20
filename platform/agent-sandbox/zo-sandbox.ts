import { readSessionCapability } from "../../src/initiator-auth.ts";
import { defineSandbox, type SandboxDefinition } from "eve/sandbox";
import { type ZoBackendSessionOptions, zoBackend } from "./zo-backend";

// Author-facing helper for an agent's `agent/sandbox.ts`. Agents write
// `export default zoSandbox()` and never name the provider — the built-in
// sandbox is Daytona-backed today, but the runtime never talks to Daytona or
// holds its key: it asks the Zo control plane (apps/api) to provision its
// sandbox and gets back scoped SSH access. The provider is an implementation
// detail behind that seam.

/**
 * Where the runtime reaches the control plane to provision its sandbox.
 * Defaults to `ZO_API_URL`; that's the only thing the runtime needs — never the
 * Daytona key, which lives only in the control plane.
 */
const DEFAULT_API_URL = "http://api.zo.localhost:4000";

/** Options for the Zo built-in sandbox. Kept small for MVP; grows over time. */
export interface ZoSandboxOptions {
  /** Control-plane API base URL. Defaults to `ZO_API_URL` or the dev parity host. */
  readonly apiBaseUrl?: string;
}

/**
 * The Zo built-in sandbox for an eve agent. Returns a `SandboxDefinition` to
 * default-export from `agent/sandbox.ts`.
 *
 * The backend is a factory so it reads `ZO_API_URL` lazily at first use, not at
 * module load (eve's recommended form for env-dependent options).
 */
export function zoSandbox(
  options: ZoSandboxOptions = {},
): SandboxDefinition<Record<string, never>, ZoBackendSessionOptions> {
  return defineSandbox<Record<string, never>, ZoBackendSessionOptions>({
    backend: () =>
      zoBackend({
        apiBaseUrl:
          options.apiBaseUrl ?? process.env.ZO_API_URL ?? DEFAULT_API_URL,
      }),
    onSession: async ({ ctx, use }) => {
      const sessionCapability = readSessionCapability(
        ctx.session.auth.current,
        ctx.session.auth.initiator,
      );
      await use(
        sessionCapability === undefined ? undefined : { sessionCapability },
      );
    },
  });
}
