[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [testing](../README.md) / scriptStepFrom

# Function: scriptStepFrom()

> **scriptStepFrom**(`prompt`): `number`

Defined in: [packages/agent-sdk/src/mock-model.ts:183](https://github.com/zocomputer/zov2-code/blob/2480a6ef0f68d759f57bf84a8fcb14c879dd765d/packages/agent-sdk/src/mock-model.ts#L183)

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
