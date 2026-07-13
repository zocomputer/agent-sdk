import type { GatewayMediaModel, MediaCatalogLineage, MediaResult } from "./media-contracts";
import { parseMediaCatalog } from "./media-catalog-parser";
import { mediaCatalogSnapshotId } from "./media-catalog-snapshot";

export interface CatalogRefreshResult { readonly status: "modified" | "not_modified"; readonly raw?: unknown; readonly fetchedAt?: string; readonly validatedAt?: string; readonly validators?: { readonly etag?: string; readonly lastModified?: string } }
export interface CachedMediaCatalog { readonly models: readonly GatewayMediaModel[]; readonly lineage: MediaCatalogLineage }

export function createMediaCatalogCache(options: {
  readonly refresh: (validators?: { readonly etag?: string; readonly lastModified?: string }) => Promise<CatalogRefreshResult>;
  readonly now?: () => number;
  readonly freshMs?: number;
  readonly staleMs?: number;
}) {
  const now = options.now ?? Date.now;
  const freshMs = options.freshMs ?? 5 * 60_000;
  const staleMs = options.staleMs ?? 60 * 60_000;
  if (!Number.isFinite(freshMs) || !Number.isFinite(staleMs) || freshMs < 0 || staleMs < freshMs) throw new Error("media catalog TTLs must be finite, nonnegative, and staleMs must be at least freshMs");
  let cached: { models: readonly GatewayMediaModel[]; snapshotId: string; fetchedAt: string; validatedAt: string; validatedMs: number; validators?: CatalogRefreshResult["validators"] } | undefined;
  let flight: Promise<MediaResult<CachedMediaCatalog, string>> | undefined;
  const result = (stale: boolean): MediaResult<CachedMediaCatalog, string> => cached
    ? { ok: true, value: { models: cached.models, lineage: { snapshotId: cached.snapshotId, fetchedAt: cached.fetchedAt, validatedAt: cached.validatedAt, stale, status: stale ? "stale" : "fresh" } } }
    : { ok: false, error: "No accepted media catalog snapshot is available" };
  return { async get(): Promise<MediaResult<CachedMediaCatalog, string>> {
    const age = cached ? now() - cached.validatedMs : Infinity;
    if (age <= freshMs) return result(false);
    if (flight) return flight;
    flight = (async () => {
      try {
        const refreshed = await options.refresh(cached?.validators);
        if (refreshed.status === "not_modified") {
          if (!cached) return { ok: false, error: "Catalog returned 304 without a cached snapshot" };
          cached.validatedAt = refreshed.validatedAt ?? new Date(now()).toISOString();
          cached.validatedMs = now();
          cached.validators = mergeValidators(cached.validators, refreshed.validators);
          return result(false);
        }
        const parsed = parseMediaCatalog(refreshed.raw);
        if (!parsed.ok) return cached && age <= staleMs ? result(true) : parsed;
        const timestamp = refreshed.fetchedAt ?? new Date(now()).toISOString();
        cached = { models: parsed.value, snapshotId: mediaCatalogSnapshotId(parsed.value), fetchedAt: timestamp, validatedAt: timestamp, validatedMs: now(), validators: refreshed.validators };
        return result(false);
      } catch (error) {
        return cached && age <= staleMs ? result(true) : { ok: false, error: error instanceof Error ? error.message : "Catalog refresh failed" };
      } finally { flight = undefined; }
    })();
    return flight;
  } };
}

function mergeValidators(previous: CatalogRefreshResult["validators"], next: CatalogRefreshResult["validators"]): CatalogRefreshResult["validators"] {
  const merged = { ...previous, ...next };
  return Object.keys(merged).length === 0 ? undefined : merged;
}
