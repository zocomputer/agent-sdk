[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createInstructionStackInstruction

# Function: createInstructionStackInstruction()

> **createInstructionStackInstruction**(`opts`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:790](https://github.com/zocomputer/zov2-code/blob/13e58351dfe3adc12c256d37f6058b3b4e0032bd/packages/agent-sdk/src/instructions.ts#L790)

The whole baseline prompt as ONE dynamic instruction, in the SDK's
canonical section order. Prefer this over the per-section factories: eve
orders instruction slots alphabetically by filename, so per-file wiring
surrenders section order to filenames — the stack keeps it deliberate.
Builds on "session.started" (fresh AGENTS.md read, lazy extras evaluated),
so the prompt is byte-stable for the session's lifetime (prompt-cache
safe). Consumer persona/identity instructions stay separate files — the
stack ships operational contracts, not personality.

## Parameters

### opts

[`InstructionStackOptions`](../interfaces/InstructionStackOptions.md)

## Returns

`DynamicSentinel`
