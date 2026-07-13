import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { MEDIA_CATALOG_FIXTURES } from "./media-catalog-fixtures";
import { parseMediaCatalog } from "./media-catalog-parser";
import { MediaModelsInputSchema, mediaModelsTool } from "./media-models";
import { createMediaRegistry } from "./media-registry";

const parsed = parseMediaCatalog({ data: MEDIA_CATALOG_FIXTURES });
if (!parsed.ok) throw new Error(parsed.error);
const registry = createMediaRegistry(parsed.value, { snapshotId: "snapshot", fetchedAt: "2026-07-12T00:00:00.000Z", validatedAt: "2026-07-12T00:01:00.000Z", stale: false, status: "fresh" });
const tool = mediaModelsTool({ registry: async () => ({ ok: true, value: registry }) });
type Tool = typeof tool;
const context = new Proxy({}, {}) as Parameters<Tool["execute"]>[1];

describe("media_models", () => {
  test("keeps a flat JSON-convertible discovery schema", () => {
    expect(z.toJSONSchema(MediaModelsInputSchema, { io: "input" })).toHaveProperty("type", "object");
    expect(MediaModelsInputSchema.parse({ invented: true })).toEqual({ limit: 12 });
  });
  test("lists with compact lineage and inspects unavailable adapters exactly", async () => {
    const list = await tool.execute({ limit: 2 }, context);
    expect(list).toMatchObject({ mode: "list", catalog_snapshot_id: "snapshot" });
    const inspect = await tool.execute({ model: "bfl/flux-2-pro", limit: 12 }, context);
    expect(inspect).toMatchObject({ mode: "inspect", profile: { availability: "unavailable" } });
  });
});
