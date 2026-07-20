[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createBashTool

# Function: createBashTool()

> **createBashTool**(`opts`): `ToolDefinition`\<\{ `command`: `string`; `cwd?`: `string`; `foreground_ms?`: `number`; `timeout_ms?`: `number`; \}, \{ `exitCode`: `number` \| `null`; `mode`: `"completed"`; `note?`: `undefined`; `progress?`: `undefined`; `status?`: `undefined`; `stderr`: `string`; `stdout`: `string`; `task_id?`: `undefined`; `timedOut`: `boolean`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `timedOut?`: `undefined`; `workdir`: `string`; \}\>

Defined in: [packages/agent-sdk/src/tools/bash.ts:32](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/tools/bash.ts#L32)

Build the bash tool: a real shell through the given runner (host or sandbox), rooted at the workspace.

## Parameters

### opts

#### execEnv?

[`BashExecEnv`](../type-aliases/BashExecEnv.md)

Which environment commands execute in; picks the description's intro and caution wording. Default "host".

#### interactiveHint?

`string`

#### noun

`string`

#### registry

[`TaskRegistry`](../interfaces/TaskRegistry.md)

#### runner

[`CommandRunner`](../interfaces/CommandRunner.md) \| [`CommandRunnerProvider`](../type-aliases/CommandRunnerProvider.md)

The exec backend, or a provider resolved from the tool context per call (the sandbox backend).

#### workdir

`string`

Absolute workspace root, reported as `workdir` in results.

## Returns

`ToolDefinition`\<\{ `command`: `string`; `cwd?`: `string`; `foreground_ms?`: `number`; `timeout_ms?`: `number`; \}, \{ `exitCode`: `number` \| `null`; `mode`: `"completed"`; `note?`: `undefined`; `progress?`: `undefined`; `status?`: `undefined`; `stderr`: `string`; `stdout`: `string`; `task_id?`: `undefined`; `timedOut`: `boolean`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `timedOut?`: `undefined`; `workdir`: `string`; \}\>
