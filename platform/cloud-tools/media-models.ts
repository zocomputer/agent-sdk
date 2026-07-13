import { defineTool } from "eve/tools";
import { z } from "zod";
import type { MediaResult } from "./media-contracts";
import type { MediaRegistry } from "./media-registry";

export const MediaModelsInputSchema = z.object({
  kind: z.enum(["image", "video", "speech", "transcription"]).optional(),
  operation: z.enum(["image.generate", "image.edit", "video.generate", "video.edit", "speech.generate", "audio.transcribe"]).optional(),
  query: z.string().trim().max(100).optional(),
  model: z.string().trim().min(1).optional().describe("Exact model id to inspect. Omit it to list models."),
  limit: z.number().int().min(1).max(50).default(12),
});
const DiscoveryModelSchema = z.object({
  id: z.string(),
  kind: z.enum(["image", "video", "speech", "transcription"]),
  availability: z.enum(["offered", "unverified", "unavailable"]),
  operations: z.array(z.string()),
  pricing: z.unknown().nullable(),
});
export const MediaModelsOutputSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("list"), catalog_snapshot_id: z.string().nullable(), fetched_at: z.string().nullable(), stale: z.boolean(), models: z.array(DiscoveryModelSchema) }),
  z.object({ mode: z.literal("inspect"), profile: z.unknown() }),
]);

export function mediaModelsTool(options: { readonly registry: () => Promise<MediaResult<MediaRegistry, string>> }) {
  return defineTool({
    description: "List current image, video, speech, and transcription models, or inspect exact capabilities and pricing before choosing advanced settings.",
    inputSchema: MediaModelsInputSchema,
    outputSchema: MediaModelsOutputSchema,
    async execute(input) {
      const loaded = await options.registry();
      if (!loaded.ok) throw new Error(`Media model discovery is unavailable: ${loaded.error}. Retry later.`);
      if (input.model) {
        const item = loaded.value.inspect(input.model);
        if (!item) throw new Error(`Unknown media model ${input.model}. Omit model to find current model ids.`);
        return { mode: "inspect" as const, profile: compact(item) };
      }
      const matching = loaded.value.list({ ...(input.kind ? { kind: input.kind } : {}), ...(input.operation ? { operation: input.operation } : {}), ...(input.query ? { query: input.query } : {}) });
      const items = matching.slice(0, input.limit);
      const lineage = items[0]?.lineage;
      return { mode: "list" as const, catalog_snapshot_id: lineage?.snapshotId ?? null, fetched_at: lineage?.fetchedAt ?? null, stale: lineage?.stale ?? false, models: items.map((item) => ({ id: item.id, kind: item.kind, availability: item.availability, operations: item.operations.map((op) => op.operation), pricing: item.pricing })) };
    },
  });
}

function compact(item: ReturnType<MediaRegistry["inspect"]>) {
  if (!item) return null;
  return { id: item.id, name: item.name, kind: item.kind, availability: item.availability, catalog_snapshot_id: item.lineage.snapshotId, fetched_at: item.lineage.fetchedAt, stale: item.lineage.stale, adapter_revision: item.adapterRevision, verified_at: item.verifiedAt, pricing: item.pricing, operations: item.operations.map((op) => ({ operation: op.operation, inputs: op.inputs, settings: op.settings, outputs: op.outputs, provenance: op.provenance })) };
}
