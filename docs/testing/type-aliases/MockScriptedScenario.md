[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [testing](../README.md) / MockScriptedScenario

# Type Alias: MockScriptedScenario

> **MockScriptedScenario** = `Extract`\<[`MockScenario`](MockScenario.md), `"hitl"` \| `"parallel"` \| `"todo"` \| `"delegate"`\>

Defined in: [packages/agent-sdk/src/mock-model.ts:114](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/mock-model.ts#L114)

The multi-step tool scripts (not the stream-shape tests): `hitl`, `parallel`,
`todo`, `delegate`. Each scenario emits tool calls across multiple turns.
