[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / RunResult

# Interface: RunResult

Defined in: [packages/agent-sdk/src/run.ts:16](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/run.ts#L16)

A completed command run: stdout/stderr (bounded head + tail when overflowing),
exit code (null if the spawn failed), and whether it timed out.

## Properties

### exitCode

> **exitCode**: `number` \| `null`

Defined in: [packages/agent-sdk/src/run.ts:19](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/run.ts#L19)

***

### stderr

> **stderr**: `string`

Defined in: [packages/agent-sdk/src/run.ts:18](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/run.ts#L18)

***

### stdout

> **stdout**: `string`

Defined in: [packages/agent-sdk/src/run.ts:17](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/run.ts#L17)

***

### timedOut

> **timedOut**: `boolean`

Defined in: [packages/agent-sdk/src/run.ts:20](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/run.ts#L20)
