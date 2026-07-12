[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / RunProgress

# Interface: RunProgress

Defined in: [packages/agent-sdk/src/run.ts:28](https://github.com/zocomputer/zov2-code/blob/13e58351dfe3adc12c256d37f6058b3b4e0032bd/packages/agent-sdk/src/run.ts#L28)

Live progress snapshot while a command is still running: preview text
(tail-only when truncated), byte counts, and truncation flags.

## Properties

### stderr

> **stderr**: `string`

Defined in: [packages/agent-sdk/src/run.ts:30](https://github.com/zocomputer/zov2-code/blob/13e58351dfe3adc12c256d37f6058b3b4e0032bd/packages/agent-sdk/src/run.ts#L30)

***

### stderrBytes

> **stderrBytes**: `number`

Defined in: [packages/agent-sdk/src/run.ts:32](https://github.com/zocomputer/zov2-code/blob/13e58351dfe3adc12c256d37f6058b3b4e0032bd/packages/agent-sdk/src/run.ts#L32)

***

### stderrTruncated

> **stderrTruncated**: `boolean`

Defined in: [packages/agent-sdk/src/run.ts:34](https://github.com/zocomputer/zov2-code/blob/13e58351dfe3adc12c256d37f6058b3b4e0032bd/packages/agent-sdk/src/run.ts#L34)

***

### stdout

> **stdout**: `string`

Defined in: [packages/agent-sdk/src/run.ts:29](https://github.com/zocomputer/zov2-code/blob/13e58351dfe3adc12c256d37f6058b3b4e0032bd/packages/agent-sdk/src/run.ts#L29)

***

### stdoutBytes

> **stdoutBytes**: `number`

Defined in: [packages/agent-sdk/src/run.ts:31](https://github.com/zocomputer/zov2-code/blob/13e58351dfe3adc12c256d37f6058b3b4e0032bd/packages/agent-sdk/src/run.ts#L31)

***

### stdoutTruncated

> **stdoutTruncated**: `boolean`

Defined in: [packages/agent-sdk/src/run.ts:33](https://github.com/zocomputer/zov2-code/blob/13e58351dfe3adc12c256d37f6058b3b4e0032bd/packages/agent-sdk/src/run.ts#L33)
