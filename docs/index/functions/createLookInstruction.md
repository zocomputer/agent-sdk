[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createLookInstruction

# Function: createLookInstruction()

> **createLookInstruction**(`opts`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:207](https://github.com/zocomputer/zov2-code/blob/d22a2863f30f9fa1a7f8dbb051f97b4846076bf1/packages/agent-sdk/src/instructions.ts#L207)

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

## Returns

`DynamicSentinel`
