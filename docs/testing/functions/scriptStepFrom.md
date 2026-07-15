[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [testing](../README.md) / scriptStepFrom

# Function: scriptStepFrom()

> **scriptStepFrom**(`prompt`): `number`

Defined in: [packages/agent-sdk/src/mock-model.ts:183](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/mock-model.ts#L183)

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
