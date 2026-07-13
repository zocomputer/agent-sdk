[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createInstructionStackInstruction

# Function: createInstructionStackInstruction()

> **createInstructionStackInstruction**(`opts`): `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

Defined in: [packages/agent-sdk/src/instructions.ts:763](https://github.com/zocomputer/zov2-code/blob/760605b8ac267b8d97156760bb2d6e6d1b69ada8/packages/agent-sdk/src/instructions.ts#L763)

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

`DynamicSentinel`\<\{ `markdown`: `string`; \}\>
