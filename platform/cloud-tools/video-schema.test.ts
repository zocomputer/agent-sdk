import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { GenerateVideoInputSchema } from "./video";

// eve converts every authored tool's inputSchema to JSON Schema at agent load —
// a schema zod can't convert (z.custom, transforms, …) fails the AGENT BOOT, not
// just the tool. This guard pins convertibility so a schema edit can't regress it.
describe("generate_video input schema", () => {
  test("converts to JSON Schema (eve boot requirement)", () => {
    const json = z.toJSONSchema(GenerateVideoInputSchema, { io: "input" });
    expect(json).toHaveProperty("type", "object");
  });

  test("accepts a prompt with optional aspect ratio and duration", () => {
    expect(
      GenerateVideoInputSchema.safeParse({
        prompt: "a drone shot over a canyon",
        aspect_ratio: "16:9",
        duration_seconds: 8,
      }).success,
    ).toBe(true);
    expect(GenerateVideoInputSchema.safeParse({ prompt: "just a prompt" }).success).toBe(true);
  });

  test("rejects unsupported aspect ratios and out-of-range durations", () => {
    expect(GenerateVideoInputSchema.safeParse({ prompt: "p", aspect_ratio: "21:9" }).success).toBe(false);
    expect(GenerateVideoInputSchema.safeParse({ prompt: "p", duration_seconds: 0 }).success).toBe(false);
    expect(GenerateVideoInputSchema.safeParse({ prompt: "p", duration_seconds: 120 }).success).toBe(false);
  });

  test("rejects output_dir values that are not valid state file prefixes", () => {
    for (const output_dir of ["/generated", "generated/", "generated//videos", ".", "../generated"]) {
      expect(GenerateVideoInputSchema.safeParse({ prompt: "p", output_dir }).success).toBe(false);
    }
  });
});
