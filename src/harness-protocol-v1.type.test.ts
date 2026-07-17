import { expect, test } from "bun:test";
import {
  HARNESS_MUTATION_GUARD_DEFAULT_THRESHOLD,
  HARNESS_PROTOCOL_V1_LIMITS,
  type CompletionEvidenceV1,
  type DeploymentToolManifestV1,
  type HarnessToolDescriptorV1,
  type HarnessToolResultV1,
  type HarnessWorkspaceFileEffectReceiptV1,
  type MutationGuardBlockedDataV1,
  type MutationGuardRecordV1,
} from "./harness-protocol-v1";

const editDescriptor = {
  schemaVersion: 1,
  canonicalName: "edit",
  modelName: "patch_file",
  behaviorVersion: "1.0.0",
  effect: { kind: "write", scope: "workspace" },
  presentation: { kind: "file-mutation" },
  resultKind: "workspace.file",
  honorsAbortSignal: false,
} satisfies HarnessToolDescriptorV1;

const createReceipt = {
  schemaVersion: 1,
  kind: "workspace.file",
  operation: "create",
  path: "src/new.ts",
  before: null,
  after: { sha256: "a".repeat(64), bytes: 12 },
  content: { kind: "unified-patch", patch: "+export {};\n" },
} satisfies HarnessWorkspaceFileEffectReceiptV1;

const result = {
  schemaVersion: 1,
  tool: { canonicalName: "edit", behaviorVersion: "1.0.0" },
  outcome: "completed",
  data: { changed: true },
  effects: [createReceipt],
} satisfies HarnessToolResultV1;

const guardRecord = {
  schemaVersion: 1,
  sessionId: "session-1",
  turnId: "turn-1",
  lastFingerprint: {
    canonicalName: "edit",
    behaviorVersion: "1.0.0",
    canonicalInputSha256: "d".repeat(64),
  },
  count: 2,
} satisfies MutationGuardRecordV1;

const blockedData = {
  guardVersion: 1,
  kind: "mutation-guard",
  reason: "repeated-mutation-threshold",
  fingerprint: guardRecord.lastFingerprint,
  attempt: 3,
  threshold: HARNESS_MUTATION_GUARD_DEFAULT_THRESHOLD,
  correctiveMessage: "Change the mutation or inspect the current file before retrying.",
} satisfies MutationGuardBlockedDataV1;

const blockedResult = {
  schemaVersion: 1,
  tool: { canonicalName: "edit", behaviorVersion: "1.0.0" },
  outcome: "blocked",
  data: blockedData,
} satisfies HarnessToolResultV1<MutationGuardBlockedDataV1>;

const unavailableGuardData = {
  ...blockedData,
  reason: "guard-unavailable",
  attempt: 1,
  correctiveMessage: "Mutation safety state is unavailable; inspect it before retrying.",
} satisfies MutationGuardBlockedDataV1;

const unavailableGuardResult = {
  schemaVersion: 1,
  tool: { canonicalName: "edit", behaviorVersion: "1.0.0" },
  outcome: "blocked",
  data: unavailableGuardData,
} satisfies HarnessToolResultV1<MutationGuardBlockedDataV1>;

const manifest = {
  schemaVersion: 1,
  deploymentId: "dep_123",
  sdk: {
    packageName: "@zocomputer/agent-sdk",
    version: "0.17.0",
    immutableRef: "npm:@zocomputer/agent-sdk@0.17.0#sha512-deadbeef",
  },
  descriptorCatalogDigest: { algorithm: "sha256", value: "b".repeat(64) },
  toolSourceDigest: { algorithm: "sha256", value: "c".repeat(64) },
  tools: [{ modelName: "patch_file", descriptor: editDescriptor }],
  completionContracts: [],
} satisfies DeploymentToolManifestV1;

function invalidProducerStatesMustFail(): void {
  // @ts-expect-error v2 data cannot enter a v1 producer contract.
  const unknownVersion: HarnessToolDescriptorV1 = { ...editDescriptor, schemaVersion: 2 };

  // @ts-expect-error a create receipt cannot claim a before-state.
  const impossibleCreate: HarnessWorkspaceFileEffectReceiptV1 = {
    ...createReceipt,
    before: { sha256: "a".repeat(64), bytes: 1 },
  };

  // @ts-expect-error rejected completion evidence requires a reason.
  const rejectedWithoutReason: CompletionEvidenceV1 = {
    schemaVersion: 1,
    contract: { contractId: "build", contractVersion: "1" },
    verdict: "rejected",
    data: null,
  };

  const foreignManifest: DeploymentToolManifestV1 = {
    ...manifest,
    // @ts-expect-error only the immutable Zo SDK package can author this manifest.
    sdk: { ...manifest.sdk, packageName: "other-sdk" },
  };

  void [unknownVersion, impossibleCreate, rejectedWithoutReason, foreignManifest];
}

void invalidProducerStatesMustFail;

test("producer contract freezes protocol v1 bounds", () => {
  expect(result.tool).toEqual({ canonicalName: "edit", behaviorVersion: "1.0.0" });
  expect(blockedResult.data.attempt).toBe(3);
  expect(unavailableGuardResult.data.reason).toBe("guard-unavailable");
  expect(HARNESS_MUTATION_GUARD_DEFAULT_THRESHOLD).toBe(3);
  expect(HARNESS_PROTOCOL_V1_LIMITS).toEqual({
    maxEffectsPerResult: 16,
    maxPathUtf8Bytes: 4096,
    maxUnifiedPatchUtf8Bytes: 65536,
  });
});
