import { MEDIA_PROVIDER_ADAPTERS } from "./media-adapters";
import type { GatewayMediaModel, MediaCatalogLineage, MediaModelProfile, MediaOperation, MediaOperationProfile, MediaProviderAdapter } from "./media-contracts";

export interface MediaRegistry {
  readonly list: (filters?: { readonly kind?: GatewayMediaModel["kind"]; readonly operation?: MediaOperation; readonly query?: string }) => readonly MediaModelProfile[];
  readonly inspect: (modelId: string) => MediaModelProfile | null;
  readonly executable: (modelId: string, operation: MediaOperation) => { readonly profile: MediaModelProfile; readonly adapter: MediaProviderAdapter } | null;
}

export function createMediaRegistry(models: readonly GatewayMediaModel[], lineage: MediaCatalogLineage, adapters: readonly MediaProviderAdapter[] = MEDIA_PROVIDER_ADAPTERS): MediaRegistry {
  const live = new Map(models.map((model) => [model.id, model]));
  const profile = (id: string): MediaModelProfile | null => {
    const model = live.get(id);
    const relevant = adapters.filter((adapter) => adapter.modelId === id);
    if (!model && relevant.length === 0) return null;
    const firstAdapter = relevant[0];
    if (!model && !firstAdapter) return null;
    const basis: GatewayMediaModel = model ?? absentModel(id, firstAdapter);
    const operations = model ? relevant.map((adapter) => adapter.overlay(model)) : [];
    const base = { id, name: basis.name, description: basis.description, availability: model ? (relevant.length ? "offered" as const : "unverified" as const) : "unavailable" as const, pricing: basis.pricing, adapterRevision: relevant[0]?.revision ?? null, verifiedAt: relevant[0]?.verifiedAt ?? null, lineage };
    switch (basis.kind) {
      case "image": return { ...base, kind: "image", operations: operations.filter(isImageOperation) };
      case "video": return { ...base, kind: "video", operations: operations.filter(isVideoOperation) };
      case "speech": return { ...base, kind: "speech", operations: operations.filter(isSpeechOperation) };
      case "transcription": return { ...base, kind: "transcription", operations: operations.filter(isTranscriptionOperation) };
    }
  };
  const all = models.map((model) => profile(model.id)).filter((item): item is MediaModelProfile => item !== null);
  return {
    list(filters = {}) { const q = filters.query?.toLowerCase(); return all.filter((item) => (!filters.kind || item.kind === filters.kind) && (!filters.operation || item.operations.some((op) => op.operation === filters.operation)) && (!q || `${item.id} ${item.name} ${item.description}`.toLowerCase().includes(q))); },
    inspect: profile,
    executable(modelId, operation) { const found = profile(modelId); const adapter = adapters.find((candidate) => candidate.modelId === modelId && candidate.operation === operation); return found?.availability === "offered" && adapter && found.operations.some((op) => op.operation === operation) ? { profile: found, adapter } : null; },
  };
}

function absentModel(id: string, adapter: MediaProviderAdapter | undefined): GatewayMediaModel {
  if (!adapter) throw new Error(`Invariant: ${id} has neither a catalog row nor adapter`);
  return { id, name: id, description: "Known adapter model absent from the current Gateway catalog.", kind: kindFor(adapter.operation), pricing: null, reportedOperations: [], rawCapabilities: null };
}

function isImageOperation(op: MediaOperationProfile): op is MediaOperationProfile<"image.generate" | "image.edit"> { return op.operation === "image.generate" || op.operation === "image.edit"; }
function isVideoOperation(op: MediaOperationProfile): op is MediaOperationProfile<"video.generate" | "video.edit"> { return op.operation === "video.generate" || op.operation === "video.edit"; }
function isSpeechOperation(op: MediaOperationProfile): op is MediaOperationProfile<"speech.generate"> { return op.operation === "speech.generate"; }
function isTranscriptionOperation(op: MediaOperationProfile): op is MediaOperationProfile<"audio.transcribe"> { return op.operation === "audio.transcribe"; }

function kindFor(operation: MediaOperation): GatewayMediaModel["kind"] {
  if (operation.startsWith("image.")) return "image";
  if (operation.startsWith("video.")) return "video";
  if (operation === "speech.generate") return "speech";
  return "transcription";
}
