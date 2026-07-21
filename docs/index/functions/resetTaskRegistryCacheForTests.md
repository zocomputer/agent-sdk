[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / \_\_resetTaskRegistryCacheForTests

# Function: \_\_resetTaskRegistryCacheForTests()

> **\_\_resetTaskRegistryCacheForTests**(): `void`

Defined in: [packages/agent-sdk/src/async-tasks.ts:173](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/async-tasks.ts#L173)

Test-only: drop the per-process registry dedupe so a test can simulate an
agent restart (a fresh registry over an existing store).

## Returns

`void`
