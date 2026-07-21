[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / \_\_resetTaskRegistryCacheForTests

# Function: \_\_resetTaskRegistryCacheForTests()

> **\_\_resetTaskRegistryCacheForTests**(): `void`

Defined in: [packages/agent-sdk/src/async-tasks.ts:173](https://github.com/zocomputer/zov2-code/blob/3530b39a94e929be74c3d9202bace84f47b21b44/packages/agent-sdk/src/async-tasks.ts#L173)

Test-only: drop the per-process registry dedupe so a test can simulate an
agent restart (a fresh registry over an existing store).

## Returns

`void`
