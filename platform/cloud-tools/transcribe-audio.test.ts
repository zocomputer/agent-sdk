import { describe, expect, test } from "bun:test";
import { transcribeAudioTool, type TranscribeAudioInput } from "./transcribe-audio";
import type { MediaAssetRef, MediaInvocationLineage, ResolvedMediaAsset } from "./media-contracts";
import type { StateFilesAssetStore } from "./state-files";
import { createMediaRegistry } from "./media-registry";

function audioStore(kind: ResolvedMediaAsset["kind"] = "audio") {
  const writes: { path: string; body: Uint8Array; contentType?: string }[] = [];
  const reads: { ref: MediaAssetRef; maxBytes: number }[] = [];
  const store: StateFilesAssetStore = {
    async read(ref, limits) {
      reads.push({ ref, maxBytes: limits.maxBytes });
      return { ref, body: new Uint8Array([82, 73, 70, 70]), kind, contentType: kind === "audio" ? "audio/wav" : "video/mp4", bytes: 4 };
    },
    async write(path, body, options) {
      writes.push({ path, body, ...(options?.contentType === undefined ? {} : { contentType: options.contentType }) });
      return { type: "state_asset", declarationName: "files", path, integrity: "v1.test-integrity", ...(options?.contentType === undefined ? {} : { contentType: options.contentType }), bytes: body.byteLength };
    },
  };
  return { reads, writes, store };
}

const successPreflight = async (input: TranscribeAudioInput) => ({
  ok: true as const,
  value: {
    model: "transcription/test",
    request: { inputAsset: input.input_asset, timestamps: input.timestamps ?? "segment" as const },
    estimate: { confidence: "unknown" as const },
  },
});

describe("transcribeAudioTool", () => {
  test("preflights against the live profile, reuses the resolved asset, and carries lineage", async () => {
    const recorded = audioStore();
    const registry = createMediaRegistry([{
      id: "openai/whisper-1", name: "Whisper", description: "Transcription", kind: "transcription",
      pricing: { transcriptionPerSecondUsd: "0.0001" }, reportedOperations: [], rawCapabilities: null,
    }], { snapshotId: "catalog-2", fetchedAt: "2026-07-12T00:00:00.000Z", validatedAt: "2026-07-12T00:00:00.000Z", stale: false, status: "fresh" });
    let lineage: MediaInvocationLineage | undefined;
    const tool = transcribeAudioTool({
      assetStore: recorded.store,
      registry: async () => ({ ok: true, value: registry }),
      transcribe: async (_model, _audio, _request, value) => {
        lineage = value;
        return { text: "hello", segments: [], warnings: [] };
      },
    });
    await tool.execute({ input_asset: "files:uploads/note.wav" }, new Proxy({}, {}) as Parameters<typeof tool.execute>[1]);
    expect(recorded.reads).toHaveLength(1);
    expect(lineage).toMatchObject({ operation: "audio.transcribe", concreteModelId: "openai/whisper-1", catalogSnapshotId: "catalog-2" });
  });

  test("reads a bounded audio asset and returns a compact transcript", async () => {
    const recorded = audioStore();
    let providerCalls = 0;
    const tool = transcribeAudioTool({
      assetStore: recorded.store,
      preflight: successPreflight,
      transcribe: async () => {
        providerCalls += 1;
        return { text: "Hello world", segments: [{ text: "Hello world", startSecond: 0, endSecond: 1.5 }], language: "en", durationInSeconds: 1.5, warnings: [] };
      },
    });
    const output = await tool.execute({ input_asset: "files:uploads/note.wav", timestamps: "segment" }, new Proxy({}, {}) as Parameters<typeof tool.execute>[1]);
    expect(providerCalls).toBe(1);
    expect(recorded.reads).toEqual([{ ref: { type: "state_asset", declarationName: "files", path: "uploads/note.wav" }, maxBytes: 25 * 1024 * 1024 }]);
    expect(output).toMatchObject({ transcript: "Hello world", detectedLanguage: "en", durationSeconds: 1.5, truncated: false });
    expect(recorded.writes).toEqual([]);
  });

  test("spills long segment output to a durable caption asset", async () => {
    const recorded = audioStore();
    const tool = transcribeAudioTool({
      assetStore: recorded.store,
      inlineCharacterLimit: 8,
      inlineSegmentLimit: 1,
      randomId: () => "spill123",
      preflight: successPreflight,
      transcribe: async () => ({ text: "A long transcript", segments: [{ text: "A", startSecond: 0, endSecond: 1 }, { text: "long", startSecond: 1, endSecond: 2 }], warnings: [] }),
    });
    const output = await tool.execute({ input_asset: "files:uploads/note.wav", output_format: "vtt", output_dir: "captions" }, new Proxy({}, {}) as Parameters<typeof tool.execute>[1]);
    expect(output.transcript).toBe("A long t");
    expect(output.segments).toHaveLength(1);
    expect(output.truncated).toBe(true);
    expect(output.transcriptAsset?.path).toBe("captions/transcript-spill123.vtt");
    expect(new TextDecoder().decode(recorded.writes[0]?.body)).toContain("WEBVTT");
  });

  test("rejects video before provider execution", async () => {
    const recorded = audioStore("video");
    let providerCalls = 0;
    const tool = transcribeAudioTool({
      assetStore: recorded.store,
      preflight: successPreflight,
      transcribe: async () => { providerCalls += 1; throw new Error("unreachable"); },
    });
    await expect(tool.execute({ input_asset: "files:uploads/clip.mp4" }, new Proxy({}, {}) as Parameters<typeof tool.execute>[1])).rejects.toThrow("audio assets only");
    expect(providerCalls).toBe(0);
    expect(recorded.writes).toEqual([]);
  });

  test("never reads, calls the provider, or writes after correction", async () => {
    const recorded = audioStore();
    let providerCalls = 0;
    const tool = transcribeAudioTool({
      assetStore: recorded.store,
      preflight: async () => ({ ok: false, error: { code: "setting_unsupported", message: "Diarization unavailable." } }),
      transcribe: async () => { providerCalls += 1; throw new Error("unreachable"); },
    });
    await expect(tool.execute({ input_asset: "files:uploads/note.wav" }, new Proxy({}, {}) as Parameters<typeof tool.execute>[1])).rejects.toThrow("No provider request was made");
    expect(recorded.reads).toEqual([]);
    expect(providerCalls).toBe(0);
    expect(recorded.writes).toEqual([]);
  });
});
