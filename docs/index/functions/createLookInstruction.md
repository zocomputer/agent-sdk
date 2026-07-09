[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createLookInstruction

# Function: createLookInstruction()

> **createLookInstruction**(`opts`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:456](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/instructions.ts#L456)

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

`DynamicSentinel`
