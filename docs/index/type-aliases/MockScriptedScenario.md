[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MockScriptedScenario

# Type Alias: MockScriptedScenario

> **MockScriptedScenario** = `Extract`\<[`MockScenario`](MockScenario.md), `"hitl"` \| `"parallel"` \| `"todo"` \| `"delegate"`\>

Defined in: [packages/agent-sdk/src/mock-model.ts:102](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/mock-model.ts#L102)

The multi-step tool scripts (not the stream-shape tests): `hitl`, `parallel`,
`todo`, `delegate`. Each scenario emits tool calls across multiple turns.
