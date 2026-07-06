import { describe, expect, test } from "bun:test";

import { CLOUD_TOOL_META, cloudToolMeta } from "./tool-meta";

describe("cloudToolMeta", () => {
  test("resolves a known built-in by its subpath key", () => {
    expect(cloudToolMeta("image")).toBe(CLOUD_TOOL_META.image);
    expect(cloudToolMeta("image")?.description).toContain("Generate an image");
  });

  test("returns null for an unknown key", () => {
    expect(cloudToolMeta("mystery")).toBeNull();
    expect(cloudToolMeta("")).toBeNull();
  });

  test("every entry carries a non-empty description", () => {
    for (const [name, meta] of Object.entries(CLOUD_TOOL_META)) {
      expect(meta.description.length, name).toBeGreaterThan(0);
    }
  });
});
