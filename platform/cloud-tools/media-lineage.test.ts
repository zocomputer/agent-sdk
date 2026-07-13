import { describe, expect, test } from "bun:test";
import { parseMediaInvocationLineage } from "../../../apps/api/src/lib/gateway-request";
import { serializeMediaInvocationLineage } from "./media-lineage";

describe("media invocation lineage wire", () => {
  test("round-trips the cloud preflight contract through the API parser", () => {
    const lineage = {
      operation: "video.generate" as const,
      concreteModelId: "xai/grok-imagine-video",
      catalogSnapshotId: "sha256:catalog-42",
      catalogStatus: "fresh" as const,
      adapterRevision: "2026-07-12.1",
      estimate: { confidence: "range" as const, minUsd: 0.1, maxUsd: 0.3 },
    };
    expect(parseMediaInvocationLineage(serializeMediaInvocationLineage(lineage))).toEqual(lineage);
  });
});
