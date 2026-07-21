[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / CompletionEvidenceV1

# Type Alias: CompletionEvidenceV1

> **CompletionEvidenceV1** = \{ `contract`: \{ `contractId`: `string`; `contractVersion`: `string`; \}; `data`: [`HarnessJsonValue`](HarnessJsonValue.md); `schemaVersion`: `1`; `verdict`: `"satisfied"`; \} \| \{ `contract`: \{ `contractId`: `string`; `contractVersion`: `string`; \}; `data`: [`HarnessJsonValue`](HarnessJsonValue.md); `reason`: `string`; `schemaVersion`: `1`; `verdict`: `"rejected"`; \}

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:158](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/harness-protocol-v1.ts#L158)

Typed completion-tool payload; it cannot define its own trusted policy.
