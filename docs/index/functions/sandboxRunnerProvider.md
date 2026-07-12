[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / sandboxRunnerProvider

# Function: sandboxRunnerProvider()

> **sandboxRunnerProvider**(`options`): [`CommandRunnerProvider`](../type-aliases/CommandRunnerProvider.md)

Defined in: [packages/agent-sdk/src/sandbox-run.ts:131](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/sandbox-run.ts#L131)

A `CommandRunnerProvider` over the session sandbox — pass as the `runner`
option of `createBashTool`/`createBashOp` (or use `createSandboxFileTools`,
which wires the whole set).

## Parameters

### options

[`SandboxRunnerOptions`](../interfaces/SandboxRunnerOptions.md)

## Returns

[`CommandRunnerProvider`](../type-aliases/CommandRunnerProvider.md)
