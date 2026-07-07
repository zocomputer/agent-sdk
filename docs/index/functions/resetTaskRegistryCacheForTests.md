[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / \_\_resetTaskRegistryCacheForTests

# Function: \_\_resetTaskRegistryCacheForTests()

> **\_\_resetTaskRegistryCacheForTests**(): `void`

Defined in: [packages/agent-sdk/src/async-tasks.ts:119](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/async-tasks.ts#L119)

Test-only: drop the per-process registry dedupe so a test can simulate an
agent restart (a fresh registry over an existing store).

## Returns

`void`
