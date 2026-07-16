import { describe, expect, test } from "bun:test";
import { generateSpeechTool, type GenerateSpeechInput } from "./generate-speech";
import { createMediaRegistry } from "./media-registry";
import type { MediaInvocationLineage } from "./media-contracts";
import type { StateFilesAssetWriter } from "./state-files";

function writer() {
  const writes: { path: string; body: Uint8Array; contentType?: string }[] = [];
  const assetWriter: StateFilesAssetWriter = {
    async write(path, body, options) {
      writes.push({ path, body, ...(options?.contentType === undefined ? {} : { contentType: options.contentType }) });
      return { type: "state_asset", declarationName: "files", path, integrity: "v1.test-integrity", ...(options?.contentType === undefined ? {} : { contentType: options.contentType }), bytes: body.byteLength };
    },
  };
  return { writes, assetWriter };
}

describe("generateSpeechTool", () => {
  test("uses the offered catalog model and carries exact character-cost lineage", async () => {
    const recorded = writer();
    const registry = createMediaRegistry([{
      id: "openai/tts-1", name: "TTS", description: "Speech", kind: "speech",
      pricing: { speechPerCharacterUsd: "0.000015" }, reportedOperations: [], rawCapabilities: null,
    }], { snapshotId: "catalog-1", fetchedAt: "2026-07-12T00:00:00.000Z", validatedAt: "2026-07-12T00:00:00.000Z", stale: false, status: "fresh" });
    let lineage: MediaInvocationLineage | undefined;
    let request: unknown;
    const tool = generateSpeechTool({
      assetWriter: recorded.assetWriter,
      registry: async () => ({ ok: true, value: registry }),
      generate: async (_model, value, lineageValue) => {
        request = value;
        lineage = lineageValue;
        return { audio: { mediaType: "audio/mpeg", format: "mp3", uint8Array: new Uint8Array([1]) }, warnings: [] };
      },
    });
    const output = await tool.execute({ text: "abcd", voice: "nova", language: "en" }, new Proxy({}, {}) as Parameters<typeof tool.execute>[1]);
    expect(output.estimate).toEqual({ confidence: "exact", amountUsd: 0.00006 });
    expect(lineage).toMatchObject({ operation: "speech.generate", concreteModelId: "openai/tts-1", catalogSnapshotId: "catalog-1", estimate: output.estimate });
    // `language` is an adapter-declared setting; it must pass preflight and
    // reach the provider request (it was previously rejected at preflight).
    expect(request).toMatchObject({ text: "abcd", voice: "nova", language: "en" });
  });

  test("default-model calls accept the bounded stale window; explicit models require fresh", async () => {
    // Parity with the image/video lanes: only an explicit model request insists
    // on fresh catalog membership.
    const staleRegistry = createMediaRegistry([{
      id: "openai/tts-1", name: "TTS", description: "Speech", kind: "speech",
      pricing: { speechPerCharacterUsd: "0.000015" }, reportedOperations: [], rawCapabilities: null,
    }], { snapshotId: "catalog-1", fetchedAt: "2026-07-12T00:00:00.000Z", validatedAt: "2026-07-12T00:00:00.000Z", stale: true, status: "stale" });
    let providerCalls = 0;
    const tool = generateSpeechTool({
      assetWriter: writer().assetWriter,
      registry: async () => ({ ok: true, value: staleRegistry }),
      generate: async () => {
        providerCalls += 1;
        return { audio: { mediaType: "audio/mpeg", format: "mp3", uint8Array: new Uint8Array([1]) }, warnings: [] };
      },
    });
    const context = new Proxy({}, {}) as Parameters<typeof tool.execute>[1];
    await tool.execute({ text: "Hello" }, context);
    expect(providerCalls).toBe(1);
    await expect(tool.execute({ text: "Hello", model: "openai/tts-1" }, context)).rejects.toThrow("stale");
    expect(providerCalls).toBe(1);
  });

  test("preflights, calls the provider once, and persists playable audio", async () => {
    const recorded = writer();
    const calls: unknown[] = [];
    const tool = generateSpeechTool({
      assetWriter: recorded.assetWriter,
      randomId: () => "abc12345",
      preflight: async (input) => ({ ok: true, value: { model: "speech/test", request: { text: input.text, ...(input.voice === undefined ? {} : { voice: input.voice }), format: "wav" }, estimate: { confidence: "exact", amountUsd: 0.02 } } }),
      generate: async (model, request) => {
        calls.push({ model, request });
        return { audio: { mediaType: "audio/wav", format: "wav", uint8Array: new Uint8Array([82, 73, 70, 70]) }, warnings: ["notice"] };
      },
    });
    const output = await tool.execute({ text: "Hello world", voice: "calm", output_dir: "spoken" } satisfies GenerateSpeechInput, new Proxy({}, {}) as Parameters<typeof tool.execute>[1]);
    expect(calls).toEqual([{ model: "speech/test", request: { text: "Hello world", voice: "calm", format: "wav" } }]);
    expect(recorded.writes[0]?.path).toBe("spoken/hello-world-abc12345.wav");
    expect(output.asset).toEqual({ type: "state_asset", declarationName: "files", path: "spoken/hello-world-abc12345.wav", integrity: "v1.test-integrity", contentType: "audio/wav", bytes: 4 });
    expect(JSON.stringify(output)).not.toContain("http");
  });

  test("never calls the provider or writer after corrective preflight", async () => {
    const recorded = writer();
    let providerCalls = 0;
    const tool = generateSpeechTool({
      assetWriter: recorded.assetWriter,
      preflight: async () => ({ ok: false, error: { code: "setting_unsupported", message: "Unknown voice." } }),
      generate: async () => { providerCalls += 1; throw new Error("unreachable"); },
    });
    await expect(tool.execute({ text: "Hello", voice: "invented" }, new Proxy({}, {}) as Parameters<typeof tool.execute>[1])).rejects.toThrow("No provider request was made");
    expect(providerCalls).toBe(0);
    expect(recorded.writes).toEqual([]);
  });
});
