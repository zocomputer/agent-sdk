[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MockScriptedScenario

# Type Alias: MockScriptedScenario

> **MockScriptedScenario** = `Extract`\<[`MockScenario`](MockScenario.md), `"hitl"` \| `"parallel"` \| `"todo"` \| `"delegate"`\>

Defined in: [packages/agent-sdk/src/mock-model.ts:114](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/mock-model.ts#L114)

The multi-step tool scripts (not the stream-shape tests): `hitl`, `parallel`,
`todo`, `delegate`. Each scenario emits tool calls across multiple turns.
