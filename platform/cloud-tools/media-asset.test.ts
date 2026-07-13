import { describe, expect, test } from "bun:test";
import { formatMediaAssetRef, parseMediaAssetRef, sniffMediaAsset } from "./media-asset";

describe("media asset references", () => {
  test("round-trips the opaque scalar within the configured declaration", () => {
    const ref = parseMediaAssetRef("files:uploads/cat.png", "files");
    expect(ref).toEqual({ type: "state_asset", declarationName: "files", path: "uploads/cat.png" });
    expect(ref === null ? null : formatMediaAssetRef(ref, "files")).toBe("files:uploads/cat.png");
  });

  test("rejects traversal, absolute paths, and another declaration", () => {
    expect(parseMediaAssetRef("files:../secret", "files")).toBeNull();
    expect(parseMediaAssetRef("files:/secret", "files")).toBeNull();
    expect(() => formatMediaAssetRef({ type: "state_asset", declarationName: "other", path: "a.png" }, "files")).toThrow("configured");
  });
});

describe("sniffMediaAsset", () => {
  test("trusts magic bytes over descriptive metadata", () => {
    const body = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const resolved = sniffMediaAsset({ type: "state_asset", declarationName: "files", path: "fake.mp3", contentType: "audio/mpeg" }, body);
    expect(resolved).toMatchObject({ kind: "image", contentType: "image/png", bytes: 8 });
    expect(resolved?.ref.contentType).toBe("image/png");
  });

  test("rejects unknown bytes", () => {
    expect(sniffMediaAsset({ type: "state_asset", declarationName: "files", path: "x.bin" }, new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
