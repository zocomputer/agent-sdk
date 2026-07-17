/**
 * Runtime-dependency-free producer types for the Zo harness protocol.
 *
 * The client mirrors these wire types in chat-core and both sides pin their
 * interpretation to the same JSON fixtures. Neither package imports the other.
 */

/** JSON data that may be persisted unchanged in a terminal tool result. */
export type HarnessJsonValue =
  | boolean
  | number
  | string
  | null
  | { readonly [key: string]: HarnessJsonValue }
  | readonly HarnessJsonValue[];

/** SHA-256 identity used for immutable artifacts and file states. */
export type HarnessSha256Digest = {
  readonly algorithm: "sha256";
  readonly value: string;
};

/** Effect class used by hosts to apply trusted execution and rendering policy. */
export type HarnessToolEffectV1 =
  | { readonly kind: "none" }
  | {
      readonly kind: "read";
      readonly scope: "workspace" | "external";
    }
  | {
      readonly kind: "write";
      readonly scope: "workspace" | "external";
    }
  | { readonly kind: "process" };

/** Host presentation selected from trusted descriptor metadata. */
export type HarnessToolPresentationV1 =
  | { readonly kind: "generic" }
  | { readonly kind: "file-mutation" }
  | { readonly kind: "todo-state" }
  | { readonly kind: "completion" };

/** Trusted behavior and presentation metadata for one model-facing tool name. */
export type HarnessToolDescriptorV1 = {
  readonly schemaVersion: 1;
  readonly canonicalName: string;
  readonly modelName: string;
  readonly behaviorVersion: string;
  readonly effect: HarnessToolEffectV1;
  readonly presentation: HarnessToolPresentationV1;
  readonly resultKind: string;
  /** Describes only the implementation. It grants no client cancellation control. */
  readonly honorsAbortSignal: boolean;
};

/** Content identity before or after a workspace file mutation. */
export type HarnessFileStateV1 = {
  readonly sha256: string;
  readonly bytes: number;
};

/** Bounded model-facing representation of one workspace file change. */
export type HarnessFileEffectContentV1 =
  | {
      readonly kind: "unified-patch";
      readonly patch: string;
    }
  | { readonly kind: "binary" }
  | {
      readonly kind: "truncated";
      readonly originalBytes: number;
    };

/** Optional Eve turn identity attached by the executing runtime. */
export type HarnessEffectTurnIdentityV1 = {
  readonly sessionId: string;
  readonly turnId: string;
};

/** Fields shared by every workspace file effect receipt. */
export type HarnessWorkspaceFileEffectCommonV1 = {
  readonly schemaVersion: 1;
  readonly kind: "workspace.file";
  readonly path: string;
  readonly content: HarnessFileEffectContentV1;
  readonly callId?: string;
  readonly turn?: HarnessEffectTurnIdentityV1;
};

/**
 * A bounded workspace file receipt. Operation-specific nullability prevents a
 * create from claiming a before-state or a delete from claiming an after-state.
 */
export type HarnessWorkspaceFileEffectReceiptV1 = HarnessWorkspaceFileEffectCommonV1 &
  (
    | {
        readonly operation: "create";
        readonly before: null;
        readonly after: HarnessFileStateV1;
      }
    | {
        readonly operation: "update";
        readonly before: HarnessFileStateV1;
        readonly after: HarnessFileStateV1;
      }
    | {
        readonly operation: "delete";
        readonly before: HarnessFileStateV1;
        readonly after: null;
      }
  );

/** Effect receipts supported by harness protocol v1. */
export type HarnessEffectReceiptV1 = HarnessWorkspaceFileEffectReceiptV1;

/** Structured terminal data returned normally through Eve. */
export type HarnessToolResultV1<Data extends HarnessJsonValue = HarnessJsonValue> = {
  readonly schemaVersion: 1;
  readonly tool: {
    readonly canonicalName: string;
    readonly behaviorVersion: string;
  };
  readonly outcome: "completed" | "rejected" | "blocked";
  readonly data: Data;
  readonly effects?: readonly HarnessEffectReceiptV1[];
};

/** Trusted rule deciding whether a completion contract applies to a turn. */
export type CompletionApplicabilityV1 =
  | { readonly kind: "always" }
  | {
      /** A host-owned predicate resolved from trusted route and agent context. */
      readonly kind: "host-predicate";
      readonly predicateId: string;
    };

/** Whether an applicable completion contract is advisory or mandatory. */
export type CompletionPolicyV1 =
  | { readonly kind: "optional" }
  | { readonly kind: "required" };

/** Trusted completion policy carried by an immutable deployment manifest. */
export type CompletionContractV1 = {
  readonly schemaVersion: 1;
  readonly contractId: string;
  readonly contractVersion: string;
  readonly applicability: CompletionApplicabilityV1;
  readonly completionTool: {
    readonly canonicalName: string;
    readonly behaviorVersion: string;
  };
  readonly policy: CompletionPolicyV1;
  readonly trustedReminder: string;
  readonly turnOutputSchema?: { readonly [key: string]: HarnessJsonValue };
};

/** Typed completion-tool payload; it cannot define its own trusted policy. */
export type CompletionEvidenceV1 =
  | {
      readonly schemaVersion: 1;
      readonly contract: {
        readonly contractId: string;
        readonly contractVersion: string;
      };
      readonly verdict: "satisfied";
      readonly data: HarnessJsonValue;
    }
  | {
      readonly schemaVersion: 1;
      readonly contract: {
        readonly contractId: string;
        readonly contractVersion: string;
      };
      readonly verdict: "rejected";
      readonly reason: string;
      readonly data: HarnessJsonValue;
    };

/** One model-facing tool name bound to its trusted canonical descriptor. */
export type DeploymentToolBindingV1 = {
  readonly modelName: string;
  readonly descriptor: HarnessToolDescriptorV1;
};

/** Exact SDK and source authority for one selectable deployment. */
export type DeploymentToolManifestV1 = {
  readonly schemaVersion: 1;
  readonly deploymentId: string;
  readonly sdk: {
    readonly packageName: "@zocomputer/agent-sdk";
    readonly version: string;
    /** Immutable package/tree identity. Mutable ranges are rejected at preflight. */
    readonly immutableRef: string;
  };
  readonly descriptorCatalogDigest: HarnessSha256Digest;
  readonly toolSourceDigest: HarnessSha256Digest;
  readonly tools: readonly DeploymentToolBindingV1[];
  readonly completionContracts: readonly CompletionContractV1[];
};

/** Wire-size limits shared by protocol producers and validating hosts. */
export const HARNESS_PROTOCOL_V1_LIMITS = {
  maxEffectsPerResult: 16,
  maxPathUtf8Bytes: 4 * 1024,
  maxUnifiedPatchUtf8Bytes: 64 * 1024,
} as const;

/** Default number of consecutive identical mutations permitted before blocking. */
export const HARNESS_MUTATION_GUARD_DEFAULT_THRESHOLD = 3;

/** Canonical identity of one guarded mutation attempt. */
export type MutationGuardFingerprintV1 = {
  readonly canonicalName: string;
  readonly behaviorVersion: string;
  readonly canonicalInputSha256: string;
};

/** Durable consecutive-run state scoped to one Eve session and turn. */
export type MutationGuardRecordV1 = {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly turnId: string;
  readonly lastFingerprint: MutationGuardFingerprintV1;
  readonly count: number;
};

/** Durable guard decision returned before a mutation executes. */
export type MutationGuardDecisionV1 =
  | {
      readonly kind: "proceed";
      readonly fingerprint: MutationGuardFingerprintV1;
      readonly attempt: number;
    }
  | {
      readonly kind: "blocked";
      readonly data: MutationGuardBlockedDataV1;
    };

/** Typed `data` payload for a normally returned blocked tool result. */
export type MutationGuardBlockedDataV1 = {
  readonly guardVersion: 1;
  readonly kind: "mutation-guard";
  readonly reason: "repeated-mutation-threshold" | "guard-unavailable";
  readonly fingerprint: MutationGuardFingerprintV1;
  readonly attempt: number;
  readonly threshold: number;
  readonly correctiveMessage: string;
};
