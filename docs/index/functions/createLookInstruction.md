[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createLookInstruction

# Function: createLookInstruction()

> **createLookInstruction**(`opts`): `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

Defined in: [packages/agent-sdk/src/instructions.ts:464](https://github.com/zocomputer/zov2-code/blob/3f99c6555eb919be314852ec3a36b08e02504d85/packages/agent-sdk/src/instructions.ts#L464)

The media-delegation playbook for agents with a `look` oracle wired: view
natively what the session model supports, delegate the rest to the oracle.
Static markdown, session-stable (prompt-cache safe), parameterized once at
build time.

## Parameters

### opts

#### capabilities

[`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)

#### modelName

`string`

#### parentCapabilities?

[`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

## Returns

`DynamicSentinel`\<\{ `markdown`: `string`; \}\>
