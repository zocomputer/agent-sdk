[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / \_\_resetTaskRegistryCacheForTests

# Function: \_\_resetTaskRegistryCacheForTests()

> **\_\_resetTaskRegistryCacheForTests**(): `void`

Defined in: [packages/agent-sdk/src/async-tasks.ts:131](https://github.com/zocomputer/zov2-code/blob/760605b8ac267b8d97156760bb2d6e6d1b69ada8/packages/agent-sdk/src/async-tasks.ts#L131)

Test-only: drop the per-process registry dedupe so a test can simulate an
agent restart (a fresh registry over an existing store).

## Returns

`void`
