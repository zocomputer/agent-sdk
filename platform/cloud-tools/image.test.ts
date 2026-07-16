import { describe, expect, test } from "bun:test";

import type { MediaPreflight, MediaPreflightSuccess, MediaResult, ResolvedMediaAsset } from "./media-contracts";
import { generateImageTool } from "./image";
import type { StateFilesAssetStore } from "./state-files";

const lineage = {
  operation: "image.generate" as const,
  concreteModelId: "bfl/flux-2-pro",
  catalogSnapshotId: "sha256:test",
  catalogStatus: "fresh" as const,
  adapterRevision: "test.1",
  estimate: { confidence: "unknown" as const },
};

function preflight(assets: readonly ResolvedMediaAsset[] = []): MediaPreflight {
  return {
    async run<TOperation extends Parameters<MediaPreflight["run"]>[0]["operation"], TMappedCall = unknown>(): Promise<MediaResult<MediaPreflightSuccess<TOperation, TMappedCall>, never>> {
      const value = { profile: {}, adapter: {}, mappedCall: { assets }, estimate: lineage.estimate, lineage: { ...lineage, operation: lineage.operation as TOperation } } as unknown as MediaPreflightSuccess<TOperation, TMappedCall>;
      return { ok: true, value };
    },
  };
}

function store(): StateFilesAssetStore & { writes: string[] } {
  const writes: string[] = [];
  return {
    writes,
    async read() { throw new Error("unexpected read"); },
    async write(path, body, options) {
      writes.push(path);
      return { type: "state_asset", declarationName: "files", path, integrity: "v1.test-integrity", bytes: body.byteLength, ...(options?.contentType === undefined ? {} : { contentType: options.contentType }) };
    },
  };
}

const result = {
  image: { mediaType: "image/png", uint8Array: new Uint8Array([1]) },
  images: [
    { mediaType: "image/png", uint8Array: new Uint8Array([1]) },
    { mediaType: "image/png", uint8Array: new Uint8Array([2]) },
  ],
  warnings: ["warning"],
};

describe("generateImageTool", () => {
  test("preflights, forwards lineage, and persists every generated image", async () => {
    const assets = store();
    const calls: Parameters<NonNullable<NonNullable<Parameters<typeof generateImageTool>[0]>["generate"]>>[0][] = [];
    let id = 0;
    const tool = generateImageTool({
      assetStore: assets,
      preflight: preflight(),
      randomId: () => `id${++id}`,
      generate: async (options) => { calls.push(options); return result; },
    });
    const context = new Proxy({}, {}) as Parameters<typeof tool.execute>[1];
    const output = await tool.execute({ prompt: "Blue robot", count: 2 }, context);

    expect(output.assets).toHaveLength(2);
    expect(assets.writes).toEqual(["generated/blue-robot-id1.png", "generated/blue-robot-id2.png"]);
    expect(calls[0]?.n).toBe(2);
    expect(calls[0]?.headers?.["x-zo-media-lineage"]).toContain("sha256:test");
    expect(JSON.stringify(output)).not.toContain("http");
  });

  test("reads count/size from adapter-shaped mapped settings", async () => {
    // Regression: the adapter places count/size in mappedCall.settings (not
    // .input); reading the wrong map silently generated 1 unsized image.
    const adapterShaped: MediaPreflight = {
      async run<TOperation extends Parameters<MediaPreflight["run"]>[0]["operation"], TMappedCall = unknown>(): Promise<MediaResult<MediaPreflightSuccess<TOperation, TMappedCall>, never>> {
        const mappedCall = {
          input: { prompt: "Blue robot" },
          settings: { count: 2, size: "1024x1024" },
          assets: [],
          mediaInputs: [],
        };
        const value = { profile: {}, adapter: {}, mappedCall, estimate: lineage.estimate, lineage: { ...lineage, operation: lineage.operation as TOperation } } as unknown as MediaPreflightSuccess<TOperation, TMappedCall>;
        return { ok: true, value };
      },
    };
    const calls: Parameters<NonNullable<NonNullable<Parameters<typeof generateImageTool>[0]>["generate"]>>[0][] = [];
    const tool = generateImageTool({ assetStore: store(), preflight: adapterShaped, generate: async (options) => { calls.push(options); return result; } });
    const context = new Proxy({}, {}) as Parameters<typeof tool.execute>[1];
    await tool.execute({ prompt: "Blue robot", count: 2, size: "1024x1024" }, context);
    expect(calls[0]?.n).toBe(2);
    expect(calls[0]?.size).toBe("1024x1024");
  });

  test("passes a resolved reference as AI SDK image prompt bytes", async () => {
    const reference = resolved("references/style.png", [9, 8]);
    let prompt: unknown;
    const tool = generateImageTool({ assetStore: store(), preflight: preflight([reference]), generate: async (options) => { prompt = options.prompt; return { ...result, images: [result.image] }; } });
    const context = new Proxy({}, {}) as Parameters<typeof tool.execute>[1];
    await tool.execute({ prompt: "Use this style", reference_asset: "files:references/style.png" }, context);
    expect(prompt).toEqual({ text: "Use this style", images: [new Uint8Array([9, 8])] });
  });

  test("returns correction before provider or storage side effects", async () => {
    let calls = 0;
    const correction: MediaPreflight = { run: async () => ({ ok: false, error: { code: "operation_unsupported", message: "Unsupported combination." } }) };
    const assets = store();
    const tool = generateImageTool({ assetStore: assets, preflight: correction, generate: async () => { calls++; return result; } });
    const context = new Proxy({}, {}) as Parameters<typeof tool.execute>[1];
    await expect(tool.execute({ prompt: "x" }, context)).rejects.toThrow("No provider call was made");
    expect(calls).toBe(0);
    expect(assets.writes).toEqual([]);
  });

  test("rejects size and aspect ratio before preflight", async () => {
    let checked = 0;
    const tool = generateImageTool({ assetStore: store(), preflight: { run: async () => { checked++; return { ok: false, error: { code: "setting_unsupported", message: "no" } }; } }, generate: async () => result });
    const context = new Proxy({}, {}) as Parameters<typeof tool.execute>[1];
    await expect(tool.execute({ prompt: "x", size: "1024x1024", aspect_ratio: "1:1" }, context)).rejects.toThrow("not both");
    expect(checked).toBe(0);
  });
});

function resolved(path: string, bytes: number[]): ResolvedMediaAsset {
  const body = new Uint8Array(bytes);
  return { ref: { type: "state_asset", declarationName: "files", path }, body, kind: "image", contentType: "image/png", bytes: body.byteLength };
}
