[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildLookMarkdown

# Function: buildLookMarkdown()

> **buildLookMarkdown**(`opts`): `string`

Defined in: [packages/agent-sdk/src/instructions.ts:172](https://github.com/zocomputer/zov2-code/blob/0bb195a93a5e8bd5814dac23311408353312bc4f/packages/agent-sdk/src/instructions.ts#L172)

Pure markdown for the media-delegation playbook; see createLookInstruction.

## Parameters

### opts

#### capabilities

[`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)

The oracle model's input capabilities.

#### modelName

`string`

The oracle model's display name (e.g. "Gemini 3 Flash").

#### parentCapabilities?

[`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)

The session model's own input capabilities, when the consumer resolved
them — adds the "view what you can natively" half of the routing rule.

## Returns

`string`
