[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createBashOp

# Function: createBashOp()

> **createBashOp**(`runner`): [`BackgroundableOp`](../interfaces/BackgroundableOp.md)

Defined in: [packages/agent-sdk/src/backgroundable.ts:89](https://github.com/zocomputer/zov2-code/blob/2004eea2e2488195525555d1ec03711235aadc63/packages/agent-sdk/src/backgroundable.ts#L89)

Build the bash backgroundable op: a shell command through the stdlib's
runner. The one op every agent wants backgroundable; agents with their own
long-running ops append to the array this feeds.

## Parameters

### runner

[`CommandRunner`](../interfaces/CommandRunner.md)

## Returns

[`BackgroundableOp`](../interfaces/BackgroundableOp.md)
