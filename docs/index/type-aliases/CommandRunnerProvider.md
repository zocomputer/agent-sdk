[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / CommandRunnerProvider

# Type Alias: CommandRunnerProvider

> **CommandRunnerProvider** = (`ctx`) => [`CommandRunner`](../interfaces/CommandRunner.md)

Defined in: [packages/agent-sdk/src/run.ts:82](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/run.ts#L82)

Resolves the runner for one tool call — the exec twin of
`WorkspaceIoProvider`. A sandbox arrives per tool call (`ctx.getSandbox()`),
not per factory build, so exec tools that run against a remote backend hold
a provider and resolve it at the top of each execute. A plain
`CommandRunner` still works everywhere one is accepted (the local backend
has no per-call state).

## Parameters

### ctx

[`IoToolContext`](../interfaces/IoToolContext.md) \| `undefined`

## Returns

[`CommandRunner`](../interfaces/CommandRunner.md)
