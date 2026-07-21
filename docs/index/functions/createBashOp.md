[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createBashOp

# Function: createBashOp()

> **createBashOp**(`runner`): [`BackgroundableOp`](../interfaces/BackgroundableOp.md)

Defined in: [packages/agent-sdk/src/backgroundable.ts:96](https://github.com/zocomputer/zov2-code/blob/af9677372192b613a9430e022ed9c3a186791633/packages/agent-sdk/src/backgroundable.ts#L96)

Build the bash backgroundable op: a shell command through the stdlib's
runner. The one op every agent wants backgroundable; agents with their own
long-running ops append to the array this feeds.

## Parameters

### runner

[`CommandRunner`](../interfaces/CommandRunner.md) \| [`CommandRunnerProvider`](../type-aliases/CommandRunnerProvider.md)

## Returns

[`BackgroundableOp`](../interfaces/BackgroundableOp.md)
