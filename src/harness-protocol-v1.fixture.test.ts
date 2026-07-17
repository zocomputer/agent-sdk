import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import completionCases from "../../fixtures/harness-control-plane/cases/completion-contract-v1.cases.json" with { type: "json" };
import completionEvidenceCases from "../../fixtures/harness-control-plane/cases/completion-evidence-v1.cases.json" with { type: "json" };
import manifestCases from "../../fixtures/harness-control-plane/cases/deployment-tool-manifest-v1.cases.json" with { type: "json" };
import descriptorCases from "../../fixtures/harness-control-plane/cases/harness-tool-descriptor-v1.cases.json" with { type: "json" };
import resultCases from "../../fixtures/harness-control-plane/cases/harness-tool-result-v1.cases.json" with { type: "json" };
import { validateHarnessProtocolFixtureSchemas } from "../../fixtures/harness-control-plane/schema-validation";
import { HARNESS_PROTOCOL_V1_LIMITS } from "./harness-protocol-v1";

const fixtureDigests = [
  [
    "schemas/completion-contract-v1.schema.json",
    "726c6882b62deec545bda3b424b5f180f9c35f8ec24291debca3da9fe8b12b30",
  ],
  [
    "schemas/completion-evidence-v1.schema.json",
    "1d819fbf5fdec89b3a317a4cd71fd5bf29b7cc00837d27447bc55fa88df8481e",
  ],
  [
    "schemas/deployment-tool-manifest-v1.schema.json",
    "d3ffd9789bd19ffabf07ddc7162fd31fd7c534e51497184feb739bb25e0aa53b",
  ],
  [
    "schemas/harness-tool-descriptor-v1.schema.json",
    "c097c7be3ab0870b3508cd9c9099142cb6b300dba3e85800d4d2923e88bcf879",
  ],
  [
    "schemas/harness-tool-result-v1.schema.json",
    "5604e641c7624c651bca88dc4da6fdcc4b59566c67408ae5e2f500b191a872c6",
  ],
  [
    "cases/completion-contract-v1.cases.json",
    "c75bebffdec8bec3afcdb9df2f981b7a75a6ac3477d4f11c75ccfb77c5524a17",
  ],
  [
    "cases/completion-evidence-v1.cases.json",
    "535aef90aacfd172b3f0a25d0b1a93f00c16e72728d763bee9a613faa756f7db",
  ],
  [
    "cases/deployment-tool-manifest-v1.cases.json",
    "a7811e70f8fc0b200258eb56c087afcf197f528d8fde11569d923d4c71b98050",
  ],
  [
    "cases/harness-tool-descriptor-v1.cases.json",
    "53f373ac57add2a57b8febc5b6125b0ae62a50f38821ea630f205a86e6b99979",
  ],
  [
    "cases/harness-tool-result-v1.cases.json",
    "f73a4e6172d83bd3fdcc061fa1153ad0b66d0ce462c2be31c557897873b11933",
  ],
] as const;

async function sha256Fixture(relativePath: (typeof fixtureDigests)[number][0]): Promise<string> {
  const fixtureUrl = new URL(
    `../../fixtures/harness-control-plane/${relativePath}`,
    import.meta.url,
  );
  return createHash("sha256").update(await readFile(fixtureUrl)).digest("hex");
}

describe("harness protocol v1 producer fixtures", () => {
  test("pins the exact shared schema and case bytes", async () => {
    for (const [relativePath, digest] of fixtureDigests) {
      expect(await sha256Fixture(relativePath)).toBe(digest);
    }
  });

  test("validates every shared case against its canonical JSON Schema", async () => {
    expect(await validateHarnessProtocolFixtureSchemas()).toEqual([]);
  });

  test("covers every required acceptance and failure class", () => {
    expect([
      descriptorCases.cases.length,
      resultCases.cases.length,
      completionCases.cases.length,
      completionEvidenceCases.cases.length,
      manifestCases.cases.length,
    ]).toEqual([8, 15, 7, 6, 16]);

    expect(descriptorCases.cases.find((entry) => entry.name === "valid-model-facing-rename"))
      .toMatchObject({
        valid: true,
        value: { canonicalName: "edit", modelName: "patch_file" },
      });
    expect(resultCases.cases.some((entry) => entry.name === "unknown-result-schema-version"))
      .toBe(true);
    expect(
      resultCases.cases.some(
        (entry) => entry.name === "over-limit-multibyte-path",
      ),
    ).toBe(true);
    expect(
      resultCases.cases.some(
        (entry) => entry.name === "valid-guard-unavailable-blocked-without-effects",
      ),
    ).toBe(true);
    expect(completionCases.cases.some((entry) => entry.name === "unknown-schema-version"))
      .toBe(true);
    expect(
      completionEvidenceCases.cases.some(
        (entry) => entry.name === "malformed-self-asserted-reminder",
      ),
    ).toBe(true);
    expect(manifestCases.cases.some((entry) => entry.name === "spoofed-envelope-canonical-name"))
      .toBe(true);
    expect(manifestCases.cases.some((entry) => entry.name === "stale-deployment-manifest"))
      .toBe(true);
    expect(manifestCases.cases.some((entry) => entry.name === "duplicate-model-name-bindings"))
      .toBe(true);
  });

  test("fixture bounds equal the producer constants", () => {
    expect(resultCases.semanticLimits).toEqual(HARNESS_PROTOCOL_V1_LIMITS);
  });
});
