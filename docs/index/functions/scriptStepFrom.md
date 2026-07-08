[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / scriptStepFrom

# Function: scriptStepFrom()

> **scriptStepFrom**(`prompt`): `number`

Defined in: [packages/agent-sdk/src/mock-model.ts:171](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/mock-model.ts#L171)

Which step of a scripted scenario this doStream call is: the number of tool
RESULTS since the last user message. Step 0 emits the scenario's first tool
call(s); each tool result advances the script — so a step that emitted two
parallel calls advances by two once both resolve, regardless of whether the
harness delivers the results as one tool message or several.

## Parameters

### prompt

`LanguageModelV4Prompt`

## Returns

`number`
