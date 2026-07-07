[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / RunningCommand

# Interface: RunningCommand

Defined in: [packages/agent-sdk/src/run.ts:40](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/run.ts#L40)

A spawned command with live handles: the result promise, a progress snapshot
method, and a kill signal.

## Properties

### result

> **result**: `Promise`\<[`RunResult`](RunResult.md)\>

Defined in: [packages/agent-sdk/src/run.ts:41](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/run.ts#L41)

## Methods

### kill()

> **kill**(): `void`

Defined in: [packages/agent-sdk/src/run.ts:45](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/run.ts#L45)

Kill the command's process group via SIGTERM; safe to call after it's already exited.

#### Returns

`void`

***

### progress()

> **progress**(): [`RunProgress`](RunProgress.md)

Defined in: [packages/agent-sdk/src/run.ts:43](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/run.ts#L43)

Current progress snapshot (stdout/stderr previews, byte counts, truncation flags).

#### Returns

[`RunProgress`](RunProgress.md)
