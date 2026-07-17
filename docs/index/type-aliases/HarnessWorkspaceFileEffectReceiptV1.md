[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / HarnessWorkspaceFileEffectReceiptV1

# Type Alias: HarnessWorkspaceFileEffectReceiptV1

> **HarnessWorkspaceFileEffectReceiptV1** = [`HarnessWorkspaceFileEffectCommonV1`](HarnessWorkspaceFileEffectCommonV1.md) & \{ `after`: [`HarnessFileStateV1`](HarnessFileStateV1.md); `before`: `null`; `operation`: `"create"`; \} \| \{ `after`: [`HarnessFileStateV1`](HarnessFileStateV1.md); `before`: [`HarnessFileStateV1`](HarnessFileStateV1.md); `operation`: `"update"`; \} \| \{ `after`: `null`; `before`: [`HarnessFileStateV1`](HarnessFileStateV1.md); `operation`: `"delete"`; \}

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:94](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/harness-protocol-v1.ts#L94)

A bounded workspace file receipt. Operation-specific nullability prevents a
create from claiming a before-state or a delete from claiming an after-state.
