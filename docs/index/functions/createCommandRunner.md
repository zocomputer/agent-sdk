[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createCommandRunner

# Function: createCommandRunner()

> **createCommandRunner**(`opts`): [`CommandRunner`](../interfaces/CommandRunner.md)

Defined in: [packages/agent-sdk/src/run.ts:84](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/run.ts#L84)

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
