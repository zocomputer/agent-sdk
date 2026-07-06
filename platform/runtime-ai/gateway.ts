import { createGateway } from "ai";
import { eveSessionFetch } from "./session-fetch";

// Names the built-in tool behind a proxied gateway call, so the metering capture can
// label the resulting usage event (e.g. an image-model generation as `generate_image`)
// instead of seeing anonymous traffic. Sent by the tool wrappers on their own gateway
// calls; the api proxy strips it before forwarding upstream and stashes it in
// UsageEvent.metadata. Only tools that make their OWN gateway call need it — a
// server-side tool like web_search rides the model turn and is already named in that
// turn's `gatewayToolCalls`.
export const ZO_TOOL_HEADER = "x-zo-tool";

export const DEFAULT_ZO_AI_BASE_URL = "http://localhost:4000/runtime/ai/v4/ai";
export const DEFAULT_ZO_AI_KEY = "dev-proxy";

// The agent-token header + env var — deliberate duplicates of
// @zocomputer/runtime-auth's constants (this package is vendored self-contained;
// same rationale as ZO_TOOL_HEADER above and session-fetch's EVE_SESSION_HEADER).
// Whoever launches the runtime mints the token and injects ZO_AGENT_TOKEN (the
// dev launchers; deploys bake it into the project env); attaching it here is
// what makes every zoGateway call attributed — the api proxy rejects anonymous
// calls once RUNTIME_AUTH_SECRET is configured.
const AGENT_TOKEN_HEADER = "x-zo-agent-token";
const AGENT_TOKEN_ENV = "ZO_AGENT_TOKEN";

/**
 * The runtime's agent-token header, from its launcher-injected env — `{}` when
 * none was minted (secretless dev). Exported for tests.
 */
export function agentAuthHeaders(
  token: string | undefined = process.env[AGENT_TOKEN_ENV],
): Record<string, string> {
  const trimmed = token?.trim();
  return trimmed ? { [AGENT_TOKEN_HEADER]: trimmed } : {};
}

type GatewaySettings = NonNullable<Parameters<typeof createGateway>[0]>;

export interface ZoGatewayOptions
  extends Omit<GatewaySettings, "apiKey" | "baseURL"> {
  readonly apiKey?: string | null;
  readonly baseURL?: string | null;
}

export function resolveZoGatewayBaseUrl(
  baseURL: string | null | undefined = process.env.ZO_AI_BASE_URL,
): string {
  const trimmed = baseURL?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_BASE_URL;
}

export function resolveZoGatewayApiKey(
  apiKey: string | null | undefined = process.env.ZO_AI_KEY,
): string {
  const trimmed = apiKey?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_KEY;
}

// Explicit return type: the inferred one names @ai-sdk/gateway's GatewayProvider
// through a store-internal path, which the d.ts build rejects as non-portable.
export function zoGateway(
  options: ZoGatewayOptions = {},
): ReturnType<typeof createGateway> {
  return createGateway({
    ...options,
    // The runtime's own agent token rides every call (attribution); explicit
    // caller headers win on collision.
    headers: { ...agentAuthHeaders(), ...options.headers },
    apiKey: resolveZoGatewayApiKey(options.apiKey),
    baseURL: resolveZoGatewayBaseUrl(options.baseURL),
    // Stamp the ambient eve session id on every call (see session-fetch.ts) — the
    // join key apps/api uses to recover the session's owner when persisting usage.
    // A caller-supplied fetch still gets wrapped, so custom fetches keep the stamp.
    fetch: eveSessionFetch(undefined, options.fetch),
  });
}
