import { describe, expect, test } from "bun:test";
import { createMediaCatalogCache } from "./media-catalog-cache";
import { MEDIA_CATALOG_FIXTURES } from "./media-catalog-fixtures";
import { parseMediaCatalog } from "./media-catalog-parser";
import { createMediaPreflight } from "./media-preflight";
import { createMediaRegistry } from "./media-registry";

const lineage = { snapshotId: "s1", fetchedAt: "2026-07-12T00:00:00.000Z", validatedAt: "2026-07-12T00:00:00.000Z", stale: false, status: "fresh" as const };

describe("media catalog cache", () => {
  test("rejects invalid freshness windows", () => {
    expect(() => createMediaCatalogCache({ freshMs: 2, staleMs: 1, refresh: async () => ({ status: "not_modified" }) })).toThrow("staleMs");
  });
  test("single-flights, honors 304, then serves bounded stale data", async () => {
    let now = 0; let calls = 0; let fail = false;
    const cache = createMediaCatalogCache({ now: () => now, refresh: async () => { calls++; await Promise.resolve(); if (fail) throw new Error("offline"); return calls === 1 ? { status: "modified", raw: { data: MEDIA_CATALOG_FIXTURES }, fetchedAt: "2026-07-12T00:00:00.000Z", validators: { etag: "a" } } : { status: "not_modified", validatedAt: "2026-07-12T00:06:00.000Z" }; } });
    const [a, b] = await Promise.all([cache.get(), cache.get()]); expect(a.ok && b.ok).toBe(true); expect(calls).toBe(1);
    now = 6 * 60_000; const validated = await cache.get(); expect(validated.ok && validated.value.lineage.stale).toBe(false);
    now = 12 * 60_000; fail = true; const stale = await cache.get(); expect(stale.ok && stale.value.lineage.stale).toBe(true);
    now = 61 * 60_000 + 6 * 60_000; expect((await cache.get()).ok).toBe(false);
  });
});

describe("registry and preflight", () => {
  const parsed = parseMediaCatalog({ data: [...MEDIA_CATALOG_FIXTURES, { id: "new/image", name: "New", description: "new", type: "image" }] });
  if (!parsed.ok) throw new Error(parsed.error);
  const registry = createMediaRegistry(parsed.value, lineage);
  test("lists unverified live models and exact-inspects absent adapters", () => {
    expect(registry.inspect("new/image")?.availability).toBe("unverified");
    expect(registry.inspect("bfl/flux-2-pro")?.availability).toBe("unavailable");
  });
  test("rejects unverified before resolving assets", async () => {
    let resolved = false;
    const preflight = createMediaPreflight({ registry: async () => ({ ok: true, value: registry }), selectModel: () => "new/image", resolveAssets: async () => { resolved = true; return { ok: true, value: [] }; } });
    const result = await preflight.run({ operation: "image.generate", input: {}, catalogPolicy: "fresh" });
    expect(result.ok).toBe(false); expect(resolved).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("model_unverified");
  });
  test("rejects stale data under a fresh policy before resolving assets", async () => {
    let resolved = false;
    const staleRegistry = createMediaRegistry(parsed.value, { ...lineage, stale: true, status: "stale" });
    const preflight = createMediaPreflight({ registry: async () => ({ ok: true, value: staleRegistry }), selectModel: () => "bfl/flux-kontext-pro", resolveAssets: async () => { resolved = true; return { ok: true, value: [] }; } });
    const result = await preflight.run({ operation: "image.generate", input: {}, catalogPolicy: "fresh" });
    expect(result.ok).toBe(false); expect(resolved).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("catalog_unavailable");
  });

  test("estimates from the adapter's MAPPED settings, not the raw input", async () => {
    // Regression: executors bill from mapped.settings (image count/size), so
    // an estimate computed from raw input could disagree with the real spend.
    // This adapter normalizes any request to count: 3 — the estimate must
    // follow it even though the raw input says count: 1.
    const model = { id: "test/estimator", name: "Estimator", description: "test", kind: "image" as const, pricing: { imagePerOutputUsd: "0.05" }, reportedOperations: [], rawCapabilities: null };
    const adapter = {
      modelId: "test/estimator",
      operation: "image.generate" as const,
      revision: "test.1",
      verifiedAt: "2026-07-12",
      overlay: () => ({ operation: "image.generate" as const, inputs: { acceptedKinds: [] }, outputs: { kind: "image" as const }, settings: [], provenance: {} }),
      mapRequest: (input: unknown) => ({ ok: true as const, value: { input: input as Record<string, unknown>, settings: { count: 3 }, providerOptions: {}, assets: [], mediaInputs: [] } }),
    };
    const registryWithAdapter = createMediaRegistry([model], lineage, [adapter]);
    const preflight = createMediaPreflight({ registry: async () => ({ ok: true, value: registryWithAdapter }), selectModel: () => "test/estimator", resolveAssets: async () => ({ ok: true, value: [] }) });
    const result = await preflight.run({ operation: "image.generate", input: { prompt: "x", count: 1 }, catalogPolicy: "allow_stale" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.estimate.confidence).toBe("exact");
      if (result.value.estimate.confidence === "exact") expect(result.value.estimate.amountUsd).toBeCloseTo(0.15);
    }
  });
});
