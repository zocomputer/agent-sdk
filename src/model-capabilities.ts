// Which media kinds a model can take as input. The gateway's public model
// catalog (see ./task.ts's fetchGatewayModelCatalog) carries capability tags —
// `vision` (image input) and `file-input` (PDF) — but it under-reports the
// rest: gemini-3-pro's endpoint metadata lists no video/audio modalities even
// though Gemini natively takes both (verified against @ai-sdk/google's
// converter, which turns any file part into inlineData; see
// design/proposals/eve-hydrate-model-aware-media.md). So resolution is catalog
// tags for image/PDF plus a small curated per-family overlay for what the
// catalog can't say. Consumers resolve capabilities in a one-shot refresh
// script and check the result in (the model-blurbs posture): capability text
// lands in tool descriptions — part of the cached prompt prefix — so it must
// be static and offline-safe, never fetched at agent build time.

import type { GatewayModelInfo } from "./task";

/**
 * The media kinds a model accepts as input. Input modalities only —
 * deliberately scoped (context windows, reasoning, tool support stay out).
 */
export interface ModelInputCapabilities {
  /** Accepts `image/*` file parts (the catalog's `vision` tag). */
  readonly image: boolean;
  /** Accepts `application/pdf` file parts (the catalog's `file-input` tag). */
  readonly pdf: boolean;
  /** Accepts `video/*` file parts (overlay-sourced; the catalog can't say). */
  readonly video: boolean;
  /** Accepts `audio/*` file parts (overlay-sourced; the catalog can't say). */
  readonly audio: boolean;
}

/** The conservative default for a model the catalog doesn't know: text only. */
export const TEXT_ONLY_CAPABILITIES: ModelInputCapabilities = {
  image: false,
  pdf: false,
  video: false,
  audio: false,
};

/**
 * Per-family capability additions the gateway catalog under-reports, keyed by
 * the model id's creator segment (the part before the `/`). Applied as a
 * union on top of the catalog tags — an overlay can only add capabilities,
 * never remove what the catalog attests.
 */
export const MEDIA_CAPABILITY_OVERLAY: Record<string, Partial<ModelInputCapabilities>> = {
  // Every Gemini language model natively takes video and audio, and
  // @ai-sdk/google converts any file part to inlineData with no media-type
  // whitelist — but the catalog's endpoint metadata lists neither modality.
  // (OpenAI is deliberately absent: only its audio-preview/realtime subset
  // takes input_audio, so a family-level rule would fail mainline models.)
  google: { video: true, audio: true },
};

/**
 * Capabilities attested by one catalog entry's tags: `vision` → image,
 * `file-input` → PDF. Video/audio are always false here — the catalog can't
 * express them; that's the overlay's job (see {@link capabilitiesForModel}).
 */
export function capabilitiesFromCatalogEntry(
  entry: Pick<GatewayModelInfo, "tags">,
): ModelInputCapabilities {
  const tags = entry.tags ?? [];
  return {
    image: tags.includes("vision"),
    pdf: tags.includes("file-input"),
    video: false,
    audio: false,
  };
}

/** The creator segment of a gateway model id (`"google/gemini-3-flash"` → `"google"`), or `""` when the id carries no family signal. */
export function modelFamily(modelId: string): string {
  const slash = modelId.indexOf("/");
  return slash > 0 ? modelId.slice(0, slash).toLowerCase() : "";
}

/**
 * Resolve a model's input capabilities from the fetched gateway catalog:
 * catalog tags as the base (text-only when the model isn't listed), then the
 * curated family overlay unioned on top. Pure — feed it the result of
 * `fetchGatewayModelCatalog` from a one-shot refresh script and check the
 * output in; never call this at agent build time.
 */
export function capabilitiesForModel(
  modelId: string,
  catalog: readonly Pick<GatewayModelInfo, "id" | "tags">[],
): ModelInputCapabilities {
  const entry = catalog.find((model) => model.id === modelId);
  const base = entry ? capabilitiesFromCatalogEntry(entry) : TEXT_ONLY_CAPABILITIES;
  const overlay = MEDIA_CAPABILITY_OVERLAY[modelFamily(modelId)];
  if (overlay === undefined) return base;
  return {
    image: base.image || (overlay.image ?? false),
    pdf: base.pdf || (overlay.pdf ?? false),
    video: base.video || (overlay.video ?? false),
    audio: base.audio || (overlay.audio ?? false),
  };
}

const CAPABILITY_LABELS = [
  ["image", "images"],
  ["pdf", "PDFs"],
  ["video", "video"],
  ["audio", "audio"],
] as const satisfies readonly (readonly [keyof ModelInputCapabilities, string])[];

function joinList(items: readonly string[], conjunction: "and" | "or"): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1]}`;
}

/**
 * The one human/model-facing phrase for a capability set — "can view images
 * and PDFs, but not video or audio" — so every surface (tool descriptions,
 * unavailable-media hints, tier routing lines) says it the same way. Static
 * per capability set; prompt-cache safe wherever it's interpolated once at
 * factory time.
 */
export function describeCapabilities(caps: ModelInputCapabilities): string {
  const can = CAPABILITY_LABELS.filter(([key]) => caps[key]).map(([, label]) => label);
  const cannot = CAPABILITY_LABELS.filter(([key]) => !caps[key]).map(([, label]) => label);
  if (can.length === 0) return "can view text only (no images, PDFs, video, or audio)";
  if (cannot.length === 0) return `can view ${joinList(can, "and")}`;
  return `can view ${joinList(can, "and")}, but not ${joinList(cannot, "or")}`;
}
