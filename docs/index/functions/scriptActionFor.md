[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / scriptActionFor

# Function: scriptActionFor()

> **scriptActionFor**(`scenario`, `step`, `delegateToolName?`): [`MockScriptAction`](../type-aliases/MockScriptAction.md)

Defined in: [packages/agent-sdk/src/mock-model.ts:214](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/mock-model.ts#L214)

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
