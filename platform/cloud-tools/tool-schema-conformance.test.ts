import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { GenerateImageInputSchema, generateImageTool } from "./image";
import { generateVideoTool } from "./video";

// The agent-sdk tool-schema contract, applied to this package's model-facing
// tools (packages/agent-sdk/src/tools/AGENTS.md; the walker MIRRORS agent-sdk's
// tool-schema-conformance.test.ts — mirrored, not imported, because this
// package is vendored self-contained and takes no @zocomputer/* deps beyond
// runtime-ai):
//
//   1. no `.strict()` model-facing objects — an unknown extra key must strip,
//      never reject (newer models append invented keys; a reject bounces a
//      dollars-per-call generation as a retry loop),
//   2. no arrays of objects (the high-entropy nested shape models garble), and
//   3. snake_case param names (the Claude Code / opencode prior the SDK pins).
//
// Introspection is via `z.toJSONSchema`, where `.strict()` surfaces as
// `additionalProperties: false`.

const tools: Record<string, { inputSchema: unknown }> = {
  generate_image: generateImageTool(),
  generate_video: generateVideoTool(),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isZodSchema(value: unknown): value is z.ZodType {
  return typeof value === "object" && value !== null && "_zod" in value;
}

const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

/** Walk a JSON schema and collect shape-contract violations with their paths. */
function collectViolations(node: unknown, path: string, out: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((child, i) => collectViolations(child, `${path}[${i}]`, out));
    return;
  }
  if (!isRecord(node)) return;
  if (node.additionalProperties === false) {
    out.push(`${path}: additionalProperties: false (a .strict() model-facing object)`);
  }
  if (node.type === "array" && isRecord(node.items) && node.items.type === "object") {
    out.push(`${path}: array of objects`);
  }
  if (isRecord(node.properties)) {
    for (const key of Object.keys(node.properties)) {
      if (!SNAKE_CASE.test(key)) {
        out.push(`${path}.properties.${key}: not snake_case`);
      }
    }
  }
  for (const [key, value] of Object.entries(node)) {
    collectViolations(value, `${path}.${key}`, out);
  }
}

describe("model-facing schema shape", () => {
  // Guard the iteration itself: a refactor that empties the roster would make
  // the sweep vacuously pass.
  test("covers the full shipped toolset", () => {
    expect(Object.keys(tools).sort()).toEqual(["generate_image", "generate_video"]);
  });

  test("every schema is flat, strip-mode, and snake_case", () => {
    const violations: string[] = [];
    for (const [name, tool] of Object.entries(tools)) {
      if (!isZodSchema(tool.inputSchema)) {
        violations.push(`${name}: inputSchema is not a zod schema`);
        continue;
      }
      collectViolations(z.toJSONSchema(tool.inputSchema, { io: "input" }), name, violations);
    }
    expect(violations).toEqual([]);
  });

  test("an unknown extra key strips instead of rejecting", () => {
    const parsed = GenerateImageInputSchema.safeParse({
      prompt: "a red crane",
      aspect_ratio: "16:9",
      quality: "high",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({ prompt: "a red crane", aspect_ratio: "16:9" });
    }
  });
});
