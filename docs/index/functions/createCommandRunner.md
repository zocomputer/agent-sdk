[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createCommandRunner

# Function: createCommandRunner()

> **createCommandRunner**(`opts`): [`CommandRunner`](../interfaces/CommandRunner.md)

Defined in: [packages/agent-sdk/src/run.ts:84](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/run.ts#L84)

Create a command runner rooted at the workspace. Commands run in a real
shell (no sandbox), cwd resolves within the workspace, and overflowing
output spills to files under `spillDir` (labeled workspace-relative).

## Parameters

### opts

#### spillDir

`string`

#### workspace

[`Workspace`](../interfaces/Workspace.md)

## Returns

[`CommandRunner`](../interfaces/CommandRunner.md)
