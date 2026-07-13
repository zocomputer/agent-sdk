// The settings source-of-truth guard. MEDIA_PROVIDER_ADAPTERS is the single
// declaration of every tunable media setting; this suite proves, for every
// adapter in the roster and every setting it declares, that
//   1. the lane's tool input schema accepts the setting (discovery ⊆ schema), and
//   2. supplying the setting observably changes the outgoing provider call
//      (declared ⇒ forwarded — the property whose absence let `quality`/`style`/
//      `safety` pass preflight while execution silently ignored them).
// Adding a setting without wiring it end-to-end fails here, not in production.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { MediaAssetRef, MediaSettingDefinition, ResolvedMediaAsset } from "./media-contracts";
import type { StateFilesAssetStore } from "./state-files";
import { MEDIA_PROVIDER_ADAPTERS } from "./media-adapters";
import { createMediaRegistry } from "./media-registry";
import { editImageTool, EditImageInputSchema } from "./edit-image";
import { editVideoTool, EditVideoInputSchema } from "./edit-video";
import { generateImageTool, GenerateImageInputSchema } from "./image";
import { generateSpeechTool, GenerateSpeechInputSchema } from "./generate-speech";
import { generateVideoTool, GenerateVideoInputSchema } from "./video";
import { createVideoPreflight } from "./video-lane";
import { transcribeAudioTool, TranscribeAudioInputSchema } from "./transcribe-audio";

const LINEAGE = { snapshotId: "conformance", fetchedAt: "2026-07-12T00:00:00.000Z", validatedAt: "2026-07-12T00:00:00.000Z", stale: false, status: "fresh" as const };

/** Samples for string-kind settings, keyed by setting name. A missing entry fails the suite. */
const STRING_SAMPLES: Readonly<Record<string, string>> = {
  size: "1024x1024",
  style: "Speak warmly",
  language: "en",
};

const IMAGE_RESULT = { image: { mediaType: "image/png", uint8Array: new Uint8Array([1]) }, warnings: [] };
const VIDEO_RESULT = { video: { mediaType: "video/mp4", uint8Array: new Uint8Array([2]) }, warnings: [] };

function store(kind: ResolvedMediaAsset["kind"]): StateFilesAssetStore {
  return {
    async read(ref: MediaAssetRef) {
      return { ref, body: new Uint8Array([1, 2, 3]), kind, contentType: kind === "image" ? "image/png" : kind === "video" ? "video/mp4" : "audio/wav", bytes: 3 };
    },
    async write(path, body, options) {
      return { type: "state_asset", declarationName: "files", path, bytes: body.byteLength, ...(options?.contentType === undefined ? {} : { contentType: options.contentType }) };
    },
    async resolveUrl() { return new URL("https://example.invalid/asset"); },
  };
}

function registryFor(modelId: string, kind: "image" | "video" | "speech" | "transcription") {
  const registry = createMediaRegistry(
    [{ id: modelId, name: modelId, description: "conformance", kind, pricing: null, reportedOperations: [], rawCapabilities: null }],
    LINEAGE,
  );
  return async () => ({ ok: true as const, value: registry });
}

/** Values worth trying for one definition, ordered to dodge executor defaults. */
function candidateValues(definition: MediaSettingDefinition): readonly (string | number | boolean)[] {
  switch (definition.kind) {
    case "enum": return [...definition.values].reverse();
    case "integer": return [definition.max, definition.min];
    case "number": return [definition.max, definition.min];
    case "boolean": return [true, false];
    case "string": {
      const sample = STRING_SAMPLES[definition.name];
      if (sample === undefined) throw new Error(`Add a STRING_SAMPLES entry for setting "${definition.name}".`);
      return [sample];
    }
  }
}

/** Stable projection of a captured provider call; strips non-deterministic fields. */
function project(captured: unknown): string {
  return JSON.stringify(captured, (key, value: unknown) => {
    if (key === "model" || key === "headers" || key === "abortSignal" || key === "download") return undefined;
    if (value instanceof Uint8Array) return `u8:${value.length}`;
    return value;
  });
}

interface Lane {
  readonly schema: { readonly safeParse: (value: unknown) => { readonly success: boolean; readonly data?: unknown } };
  readonly baseInput: Readonly<Record<string, unknown>>;
  /** Run the tool with the given input; resolve the captured provider call. */
  readonly run: (input: Record<string, unknown>) => Promise<unknown>;
}

const context = new Proxy({}, {}) as never;

function lanes(modelId: string): Readonly<Record<string, Lane>> {
  return {
    "image.generate": {
      schema: GenerateImageInputSchema,
      baseInput: { prompt: "Conformance probe", model: modelId },
      run: async (input) => {
        let captured: unknown;
        const tool = generateImageTool({ assetStore: store("image"), registry: registryFor(modelId, "image"), generate: async (options) => { captured = options; return IMAGE_RESULT; } });
        await tool.execute(input as never, context);
        return captured;
      },
    },
    "image.edit": {
      schema: EditImageInputSchema,
      baseInput: { prompt: "Conformance probe", model: modelId, input_asset: "files:src.png" },
      run: async (input) => {
        let captured: unknown;
        const tool = editImageTool({ assetStore: store("image"), registry: registryFor(modelId, "image"), generate: async (options) => { captured = options; return IMAGE_RESULT; } });
        await tool.execute(input as never, context);
        return captured;
      },
    },
    "video.generate": {
      schema: GenerateVideoInputSchema,
      baseInput: { prompt: "Conformance probe", model: modelId },
      run: async (input) => {
        let captured: unknown;
        const videoStore = store("video");
        const tool = generateVideoTool({
          assetStore: videoStore,
          preflight: createVideoPreflight({ assetStore: videoStore, defaultModel: modelId, registry: registryFor(modelId, "video") }),
          generate: async (options) => { captured = options; return VIDEO_RESULT; },
        });
        await tool.execute(input as never, context);
        return captured;
      },
    },
    "video.edit": {
      schema: EditVideoInputSchema,
      baseInput: { prompt: "Conformance probe", model: modelId, input_asset: "files:clip.mp4" },
      run: async (input) => {
        let captured: unknown;
        const videoStore = store("video");
        const tool = editVideoTool({
          assetStore: videoStore,
          preflight: createVideoPreflight({ assetStore: videoStore, defaultModel: modelId, registry: registryFor(modelId, "video") }),
          resolveProviderInput: async () => ({ delivery: "url", url: new URL("https://example.invalid/clip.mp4"), contentType: "video/mp4" }),
          generate: async (options) => { captured = options; return VIDEO_RESULT; },
        });
        await tool.execute(input as never, context);
        return captured;
      },
    },
    "speech.generate": {
      schema: GenerateSpeechInputSchema,
      baseInput: { text: "Conformance probe", model: modelId },
      run: async (input) => {
        let captured: unknown;
        const tool = generateSpeechTool({
          assetWriter: store("audio"),
          registry: registryFor(modelId, "speech"),
          generate: async (_model, request) => { captured = request; return { audio: { mediaType: "audio/mpeg", format: "mp3", uint8Array: new Uint8Array([3]) }, warnings: [] }; },
        });
        await tool.execute(input as never, context);
        return captured;
      },
    },
    "audio.transcribe": {
      schema: TranscribeAudioInputSchema,
      baseInput: { input_asset: "files:note.wav", model: modelId },
      run: async (input) => {
        let captured: unknown;
        const tool = transcribeAudioTool({
          assetStore: store("audio"),
          registry: registryFor(modelId, "transcription"),
          transcribe: async (_model, _audio, request) => { captured = request; return { text: "hi", segments: [], warnings: [] }; },
        });
        await tool.execute(input as never, context);
        return captured;
      },
    },
  };
}

describe("media settings conformance (adapter roster is the source of truth)", () => {
  let savedCostCap: string | undefined;
  beforeAll(() => {
    savedCostCap = process.env.ZO_MEDIA_MAX_COST_USD;
    delete process.env.ZO_MEDIA_MAX_COST_USD;
  });
  afterAll(() => {
    if (savedCostCap !== undefined) process.env.ZO_MEDIA_MAX_COST_USD = savedCostCap;
  });

  for (const adapter of MEDIA_PROVIDER_ADAPTERS) {
    const settings = adapter.overlay({ id: adapter.modelId, name: adapter.modelId, description: "conformance", kind: "image", pricing: null, reportedOperations: [], rawCapabilities: null }).settings;

    test(`${adapter.modelId} ${adapter.operation}: every declared setting reaches the provider call`, async () => {
      const lane = lanes(adapter.modelId)[adapter.operation];
      if (lane === undefined) throw new Error(`No conformance lane for operation ${adapter.operation} — add one.`);
      const baseline = project(await lane.run({ ...lane.baseInput }));
      for (const setting of settings) {
        // 1. The tool schema must accept the setting (else it is discoverable
        //    via media_models but unreachable through the tool).
        const sample = candidateValues(setting)[0];
        const parsed = lane.schema.safeParse({ ...lane.baseInput, [setting.name]: sample });
        expect(parsed.success, `${adapter.operation} schema rejected declared setting "${setting.name}"`).toBe(true);
        const parsedRecord = parsed.data as Record<string, unknown>;
        expect(parsedRecord[setting.name], `${adapter.operation} schema silently dropped declared setting "${setting.name}"`).toBeDefined();

        // 2. Some valid value must change the outgoing provider call.
        let changed = false;
        for (const candidate of candidateValues(setting)) {
          const projected = project(await lane.run({ ...lane.baseInput, [setting.name]: candidate }));
          if (projected !== baseline) { changed = true; break; }
        }
        expect(changed, `Setting "${setting.name}" on ${adapter.modelId} ${adapter.operation} never changed the provider call — it is validated but dropped.`).toBe(true);
      }
    });
  }
});
