[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createCommandRunner

# Function: createCommandRunner()

> **createCommandRunner**(`opts`): [`CommandRunner`](../interfaces/CommandRunner.md)

Defined in: [packages/agent-sdk/src/run.ts:100](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/run.ts#L100)

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
