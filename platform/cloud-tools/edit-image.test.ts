import { describe, expect, test } from "bun:test";

import type { MediaPreflight, MediaPreflightSuccess, MediaResult, ResolvedMediaAsset } from "./media-contracts";
import { editImageTool } from "./edit-image";
import type { StateFilesAssetStore } from "./state-files";

function resolved(path: string, byte: number): ResolvedMediaAsset {
  const body = new Uint8Array([byte]);
  return { ref: { type: "state_asset", declarationName: "files", path }, body, kind: "image", contentType: "image/png", bytes: 1 };
}

function approved(assets: readonly ResolvedMediaAsset[]): MediaPreflight {
  return { async run<TOperation extends Parameters<MediaPreflight["run"]>[0]["operation"], TMappedCall = unknown>(): Promise<MediaResult<MediaPreflightSuccess<TOperation, TMappedCall>, never>> {
    const lineage = { operation: "image.edit" as TOperation, concreteModelId: "bfl/flux-kontext-pro", catalogSnapshotId: "snapshot", catalogStatus: "fresh" as const, adapterRevision: "test", estimate: { confidence: "unknown" as const } };
    const value = { profile: {}, adapter: {}, mappedCall: { assets }, estimate: lineage.estimate, lineage } as unknown as MediaPreflightSuccess<TOperation, TMappedCall>;
    return { ok: true, value };
  } };
}

function store(): StateFilesAssetStore & { writes: string[] } {
  const writes: string[] = [];
  return { writes, async read() { throw new Error("unexpected"); }, async write(path, body, options) { writes.push(path); return { type: "state_asset", declarationName: "files", path, bytes: body.byteLength, ...(options?.contentType === undefined ? {} : { contentType: options.contentType }) }; } };
}

describe("editImageTool", () => {
  test("maps source, mask, and reference bytes into the AI SDK edit prompt", async () => {
    const storage = store();
    let call: Parameters<NonNullable<NonNullable<Parameters<typeof editImageTool>[0]>["generate"]>>[0] | undefined;
    const tool = editImageTool({
      assetStore: storage,
      preflight: approved([resolved("in.png", 1), resolved("mask.png", 2), resolved("ref.png", 3)]),
      randomId: () => "edited",
      generate: async (options) => { call = options; return { image: { mediaType: "image/png", uint8Array: new Uint8Array([4]) }, warnings: [] }; },
    });
    const context = new Proxy({}, {}) as Parameters<typeof tool.execute>[1];
    const output = await tool.execute({ input_asset: "files:in.png", mask_asset: "files:mask.png", reference_asset: "files:ref.png", prompt: "Make it blue" }, context);
    expect(call?.prompt).toEqual({ text: "Make it blue", images: [new Uint8Array([1]), new Uint8Array([3])], mask: new Uint8Array([2]) });
    expect(output.asset.path).toBe("generated/make-it-blue-edited.png");
    expect(storage.writes).toEqual(["generated/make-it-blue-edited.png"]);
  });

  test("chains a generated asset scalar and spends nothing on correction", async () => {
    let called = false;
    const tool = editImageTool({ assetStore: store(), preflight: { run: async () => ({ ok: false, error: { code: "asset_invalid", message: "Mask format unsupported." } }) }, generate: async () => { called = true; throw new Error("unreachable"); } });
    const context = new Proxy({}, {}) as Parameters<typeof tool.execute>[1];
    await expect(tool.execute({ input_asset: "files:generated/cat.png", prompt: "edit" }, context)).rejects.toThrow("No provider call was made");
    expect(called).toBe(false);
  });

  test("model output exposes only the durable files scalar", async () => {
    const tool = editImageTool({ assetStore: store(), preflight: approved([resolved("in.png", 1)]), generate: async () => ({ image: { mediaType: "image/png", uint8Array: new Uint8Array([4]) }, warnings: [] }) });
    const output = await tool.toModelOutput?.({ asset: { type: "state_asset", declarationName: "files", path: "generated/edit.png" }, model: "m", prompt: "p", warnings: [] });
    expect(JSON.stringify(output)).toContain("files:generated/edit.png");
    expect(JSON.stringify(output)).not.toContain("http");
  });
});
