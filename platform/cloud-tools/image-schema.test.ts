import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { GenerateImageInputSchema } from "./image";

// eve converts every authored tool's inputSchema to JSON Schema at agent load —
// a schema zod can't convert (z.custom, transforms, …) fails the AGENT BOOT, not
// just the tool. This guard pins convertibility so a schema edit can't regress it.
describe("generate_image input schema", () => {
  test("converts to JSON Schema (eve boot requirement)", () => {
    const json = z.toJSONSchema(GenerateImageInputSchema, { io: "input" });
    expect(json).toHaveProperty("type", "object");
  });

  test("accepts size and aspectRatio dimension shapes", () => {
    expect(
      GenerateImageInputSchema.safeParse({
        prompt: "a red crane",
        dimensions: { kind: "size", size: "1024x1024" },
      }).success,
    ).toBe(true);
    expect(
      GenerateImageInputSchema.safeParse({
        prompt: "a red crane",
        dimensions: { kind: "aspectRatio", aspectRatio: "16:9" },
      }).success,
    ).toBe(true);
  });

  test("rejects malformed dimensions", () => {
    for (const dimensions of [
      { kind: "size", size: "axb" },
      { kind: "size", size: "0x10" },
      { kind: "aspectRatio", aspectRatio: "16x9" },
    ]) {
      expect(GenerateImageInputSchema.safeParse({ prompt: "p", dimensions }).success).toBe(false);
    }
  });
});
