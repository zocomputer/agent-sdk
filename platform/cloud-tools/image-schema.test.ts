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

  test("accepts size and aspect_ratio framing params", () => {
    expect(
      GenerateImageInputSchema.safeParse({
        prompt: "a red crane",
        size: "1024x1024",
      }).success,
    ).toBe(true);
    expect(
      GenerateImageInputSchema.safeParse({
        prompt: "a red crane",
        aspect_ratio: "16:9",
      }).success,
    ).toBe(true);
    expect(GenerateImageInputSchema.safeParse({ prompt: "just a prompt" }).success).toBe(true);
  });

  test("rejects output_dir values that are not valid state file prefixes", () => {
    for (const output_dir of ["/generated", "generated/", "generated//images", ".", "generated/./images", "../generated", "generated/../images"]) {
      expect(GenerateImageInputSchema.safeParse({ prompt: "p", output_dir }).success).toBe(false);
    }
  });

  test("rejects malformed size and aspect_ratio values", () => {
    expect(GenerateImageInputSchema.safeParse({ prompt: "p", size: "axb" }).success).toBe(false);
    expect(GenerateImageInputSchema.safeParse({ prompt: "p", size: "0x10" }).success).toBe(false);
    expect(
      GenerateImageInputSchema.safeParse({ prompt: "p", aspect_ratio: "16x9" }).success,
    ).toBe(false);
  });
});
