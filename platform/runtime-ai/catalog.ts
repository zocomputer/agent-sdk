import { resolveZoGatewayApiKey, resolveZoGatewayBaseUrl } from "./gateway";
import { credentialFetch } from "./credential-fetch";
import { eveSessionFetch } from "./session-fetch";

export interface CatalogValidators { readonly etag?: string; readonly lastModified?: string }
export type CatalogFetchResult =
  | { readonly status: "not_modified"; readonly validatedAt: string; readonly validators: CatalogValidators }
  | { readonly status: "modified"; readonly raw: unknown; readonly fetchedAt: string; readonly validators: CatalogValidators };

export interface FetchMediaCatalogOptions {
  readonly baseURL?: string | null;
  readonly apiKey?: string | null;
  readonly validators?: CatalogValidators;
  readonly timeoutMs?: number;
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => Date;
}

export function resolveZoGatewayCatalogUrl(baseURL?: string | null): URL {
  const url = new URL(resolveZoGatewayBaseUrl(baseURL));
  if (!/\/v4\/ai\/?$/u.test(url.pathname)) {
    throw new Error("ZO_AI_BASE_URL must end in /v4/ai to derive the authenticated media catalog endpoint");
  }
  url.pathname = url.pathname.replace(/\/v4\/ai\/?$/u, "/v1/models");
  url.search = "";
  url.hash = "";
  return url;
}

/** Fetch the rich Gateway catalog without AI SDK's lossy model projection. */
export async function fetchMediaCatalog(options: FetchMediaCatalogOptions = {}): Promise<CatalogFetchResult> {
  const url = resolveZoGatewayCatalogUrl(options.baseURL);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
  const now = options.now ?? (() => new Date());
  // Per-request identity credential (credentialFetch) under the session stamp,
  // same layering as the model-call fetch — this authenticated catalog read
  // carries the runtime's one credential too.
  const fetcher = eveSessionFetch(undefined, credentialFetch(options.fetch));
  try {
    const response = await fetcher(url, {
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${resolveZoGatewayApiKey(options.apiKey)}`,
        ...(options.validators?.etag ? { "if-none-match": options.validators.etag } : {}),
        ...(options.validators?.lastModified ? { "if-modified-since": options.validators.lastModified } : {}),
      },
    });
    const etag = response.headers.get("etag");
    const lastModified = response.headers.get("last-modified");
    const validators = { ...(etag ? { etag } : {}), ...(lastModified ? { lastModified } : {}) };
    if (response.status === 304) return { status: "not_modified", validatedAt: now().toISOString(), validators };
    if (!response.ok) throw new Error(`Media catalog request failed (${response.status})`);
    const raw: unknown = await response.json();
    return { status: "modified", raw, fetchedAt: now().toISOString(), validators };
  } finally {
    clearTimeout(timeout);
  }
}
