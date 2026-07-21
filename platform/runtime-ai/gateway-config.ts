// The Zo gateway SETTINGS, split from `gateway.ts` so they carry no runtime
// `ai` import (only a type-only one, erased at compile). This matters for
// workspace consumers whose agent.ts graph must inline this package through
// the workspace symlink (eve's package-boundary plugin only externalizes a
// bare package import when the importer sits inside the app package root, and
// `build.externalDependencies` never applies to agent.ts's own bundle — see
// apps/local-builder-agent/lib/register.ts): they import these settings, and
// make the `createGateway` call from their own app-root module where `ai`
// externalizes cleanly.
import type { createGateway } from "ai";
import { credentialFetch } from "./credential-fetch";
import { eveSessionFetch } from "./session-fetch";
import { withStreamGuards } from "./stream-guards";

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

/**
 * The full `createGateway` settings for the Zo metering proxy — everything
 * `zoGateway()` passes: proxy base URL + placeholder key defaults, the
 * agent-token attribution header, and the guarded, session-stamping fetch.
 */
export function zoGatewaySettings(options: ZoGatewayOptions = {}): GatewaySettings {
  return {
    ...options,
    // Caller headers only. The runtime's own identity credential is attached
    // PER REQUEST in the fetch chain (`credentialFetch`), not as a static header
    // resolved once here — a warm function's Vercel OIDC token changes between
    // invocations, so a captured static token would go stale.
    headers: { ...options.headers },
    apiKey: resolveZoGatewayApiKey(options.apiKey),
    baseURL: resolveZoGatewayBaseUrl(options.baseURL),
    // Stamp the ambient eve session id on every call (see session-fetch.ts) — the
    // join key apps/api uses to recover the session's owner when persisting usage.
    // A caller-supplied fetch still gets wrapped, so custom fetches keep the stamp.
    // Layering (innermost → outermost): the caller's fetch is wrapped by
    // `credentialFetch` (attaches the one per-request identity credential),
    // then `eveSessionFetch` (stamps the billing session), then the stream
    // guards outermost (stream-guards.ts): Eve 0.22 handles provider-reported
    // transient failures, while this layer turns a silent connection into an
    // error the Eve/Workflow recovery path can handle.
    fetch: withStreamGuards(
      eveSessionFetch(undefined, credentialFetch(options.fetch)),
    ),
  };
}
