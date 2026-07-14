[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / RunningCommand

# Interface: RunningCommand

Defined in: [packages/agent-sdk/src/run.ts:41](https://github.com/zocomputer/zov2-code/blob/a7b5fa23defbcd3c7af6fb49008f7b280d46c09e/packages/agent-sdk/src/run.ts#L41)

A spawned command with live handles: the result promise, a progress snapshot
method, and a kill signal.

## Properties

### result

> **result**: `Promise`\<[`RunResult`](RunResult.md)\>

Defined in: [packages/agent-sdk/src/run.ts:42](https://github.com/zocomputer/zov2-code/blob/a7b5fa23defbcd3c7af6fb49008f7b280d46c09e/packages/agent-sdk/src/run.ts#L42)

## Methods

### kill()

> **kill**(): `void`

Defined in: [packages/agent-sdk/src/run.ts:46](https://github.com/zocomputer/zov2-code/blob/a7b5fa23defbcd3c7af6fb49008f7b280d46c09e/packages/agent-sdk/src/run.ts#L46)

Kill the command's process group via SIGTERM; safe to call after it's already exited.

#### Returns

`void`

***

### progress()

> **progress**(): [`RunProgress`](RunProgress.md)

Defined in: [packages/agent-sdk/src/run.ts:44](https://github.com/zocomputer/zov2-code/blob/a7b5fa23defbcd3c7af6fb49008f7b280d46c09e/packages/agent-sdk/src/run.ts#L44)

Current progress snapshot (stdout/stderr previews, byte counts, truncation flags).

#### Returns

[`RunProgress`](RunProgress.md)
