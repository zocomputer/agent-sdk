[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / scriptActionFor

# Function: scriptActionFor()

> **scriptActionFor**(`scenario`, `step`, `delegateToolName?`): [`MockScriptAction`](../type-aliases/MockScriptAction.md)

Defined in: [packages/agent-sdk/src/mock-model.ts:226](https://github.com/zocomputer/zov2-code/blob/2ecdaafb938b2184f882642908beb7b52901cb28/packages/agent-sdk/src/mock-model.ts#L226)

The scripted action for a scenario at a step; `text` actions end the turn.

## Parameters

### scenario

[`MockScriptedScenario`](../type-aliases/MockScriptedScenario.md)

### step

`number`

### delegateToolName?

`string` = `"task_fast"`

## Returns

[`MockScriptAction`](../type-aliases/MockScriptAction.md)
