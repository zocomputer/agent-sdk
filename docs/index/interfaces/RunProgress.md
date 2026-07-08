[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / RunProgress

# Interface: RunProgress

Defined in: [packages/agent-sdk/src/run.ts:27](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/run.ts#L27)

Live progress snapshot while a command is still running: preview text
(tail-only when truncated), byte counts, and truncation flags.

## Properties

### stderr

> **stderr**: `string`

Defined in: [packages/agent-sdk/src/run.ts:29](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/run.ts#L29)

***

### stderrBytes

> **stderrBytes**: `number`

Defined in: [packages/agent-sdk/src/run.ts:31](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/run.ts#L31)

***

### stderrTruncated

> **stderrTruncated**: `boolean`

Defined in: [packages/agent-sdk/src/run.ts:33](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/run.ts#L33)

***

### stdout

> **stdout**: `string`

Defined in: [packages/agent-sdk/src/run.ts:28](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/run.ts#L28)

***

### stdoutBytes

> **stdoutBytes**: `number`

Defined in: [packages/agent-sdk/src/run.ts:30](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/run.ts#L30)

***

### stdoutTruncated

> **stdoutTruncated**: `boolean`

Defined in: [packages/agent-sdk/src/run.ts:32](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/run.ts#L32)
