[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TaskChildToolsOptions

# Interface: TaskChildToolsOptions

Defined in: [packages/agent-sdk/src/task.ts:99](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/task.ts#L99)

Options for `createTaskChildTools`: workspace root the child is confined to,
where oversized output spills, and whether to inject directory conventions
on first read.

## Properties

### conventionsFileName?

> `optional` **conventionsFileName?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:112](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/task.ts#L112)

Conventions filename the read riders look for. Defaults to "AGENTS.md".

***

### injectDirConventions?

> `optional` **injectDirConventions?**: `boolean`

Defined in: [packages/agent-sdk/src/task.ts:110](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/task.ts#L110)

Attach a directory's conventions file to the first `read` under it, once
per directory per session (see ./dir-conventions.ts). Defaults to `true`.

***

### spillDir

> **spillDir**: `string`

Defined in: [packages/agent-sdk/src/task.ts:105](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/task.ts#L105)

Where oversized grep/webfetch output spills (the parent's spill dir).

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:103](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/task.ts#L103)

What tool descriptions call the workspace. Defaults to "workspace".

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/task.ts:101](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/task.ts#L101)

Directory the child works in; tools refuse paths that escape it.
