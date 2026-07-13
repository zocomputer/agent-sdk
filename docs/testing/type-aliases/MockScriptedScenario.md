[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [testing](../README.md) / MockScriptedScenario

# Type Alias: MockScriptedScenario

> **MockScriptedScenario** = `Extract`\<[`MockScenario`](MockScenario.md), `"hitl"` \| `"parallel"` \| `"todo"` \| `"delegate"`\>

Defined in: [packages/agent-sdk/src/mock-model.ts:114](https://github.com/zocomputer/zov2-code/blob/2f680aef81cf6a147ceac91fe4d066f3e4aff1b6/packages/agent-sdk/src/mock-model.ts#L114)

The multi-step tool scripts (not the stream-shape tests): `hitl`, `parallel`,
`todo`, `delegate`. Each scenario emits tool calls across multiple turns.
