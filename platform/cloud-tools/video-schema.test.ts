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
        aspectRatio: "16:9",
        durationSeconds: 8,
      }).success,
    ).toBe(true);
    expect(GenerateVideoInputSchema.safeParse({ prompt: "just a prompt" }).success).toBe(true);
  });

  test("rejects unsupported aspect ratios and out-of-range durations", () => {
    expect(GenerateVideoInputSchema.safeParse({ prompt: "p", aspectRatio: "21:9" }).success).toBe(false);
    expect(GenerateVideoInputSchema.safeParse({ prompt: "p", durationSeconds: 0 }).success).toBe(false);
    expect(GenerateVideoInputSchema.safeParse({ prompt: "p", durationSeconds: 120 }).success).toBe(false);
  });

  test("rejects outputDir values that are not valid state file prefixes", () => {
    for (const outputDir of ["/generated", "generated/", "generated//videos", ".", "../generated"]) {
      expect(GenerateVideoInputSchema.safeParse({ prompt: "p", outputDir }).success).toBe(false);
    }
  });
});
