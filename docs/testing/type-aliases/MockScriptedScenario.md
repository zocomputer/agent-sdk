[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [testing](../README.md) / MockScriptedScenario

# Type Alias: MockScriptedScenario

> **MockScriptedScenario** = `Extract`\<[`MockScenario`](MockScenario.md), `"hitl"` \| `"parallel"` \| `"todo"` \| `"delegate"`\>

Defined in: [packages/agent-sdk/src/mock-model.ts:114](https://github.com/zocomputer/zov2-code/blob/c064bb48e9a6d214ad3688019aaf958920a35455/packages/agent-sdk/src/mock-model.ts#L114)

The multi-step tool scripts (not the stream-shape tests): `hitl`, `parallel`,
`todo`, `delegate`. Each scenario emits tool calls across multiple turns.
