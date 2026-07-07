[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createBashTool

# Function: createBashTool()

> **createBashTool**(`opts`): `ToolDefinition`\<\{ `command`: `string`; `cwd?`: `string`; `foreground_ms?`: `number`; `notify?`: \{ `debounce_ms?`: `number`; `pattern`: `string`; `reason`: `string`; \}; `timeout_ms?`: `number`; \}, \{ `exitCode`: `number` \| `null`; `mode`: `"completed"`; `stderr`: `string`; `stdout`: `string`; `timedOut`: `boolean`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string`; `timedOut?`: `undefined`; `watching`: `string` \| `undefined`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string`; `timedOut?`: `undefined`; `workdir`: `string`; \}\>

Defined in: [packages/agent-sdk/src/tools/bash.ts:20](https://github.com/zocomputer/zov2-code/blob/6ab5ae927225cb2a14ac9cd70c43ecf9eb01921d/packages/agent-sdk/src/tools/bash.ts#L20)

Build the bash tool that runs shell commands on the real host, rooted at the workspace.

## Parameters

### opts

#### interactiveHint?

`string`

#### noun

`string`

#### registry

[`TaskRegistry`](../interfaces/TaskRegistry.md)

#### runner

[`CommandRunner`](../interfaces/CommandRunner.md)

#### workspace

[`Workspace`](../interfaces/Workspace.md)

## Returns

`ToolDefinition`\<\{ `command`: `string`; `cwd?`: `string`; `foreground_ms?`: `number`; `notify?`: \{ `debounce_ms?`: `number`; `pattern`: `string`; `reason`: `string`; \}; `timeout_ms?`: `number`; \}, \{ `exitCode`: `number` \| `null`; `mode`: `"completed"`; `stderr`: `string`; `stdout`: `string`; `timedOut`: `boolean`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string`; `timedOut?`: `undefined`; `watching`: `string` \| `undefined`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string`; `timedOut?`: `undefined`; `workdir`: `string`; \}\>
