[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TaskChildToolsOptions

# Interface: TaskChildToolsOptions

Defined in: [packages/agent-sdk/src/task.ts:100](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/task.ts#L100)

Options for `createTaskChildTools`: workspace root the child is confined to,
where oversized output spills, and whether to inject directory conventions
on first read.

## Properties

### conventionsFileName?

> `optional` **conventionsFileName?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:113](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/task.ts#L113)

Conventions filename the read riders look for. Defaults to "AGENTS.md".

***

### injectDirConventions?

> `optional` **injectDirConventions?**: `boolean`

Defined in: [packages/agent-sdk/src/task.ts:111](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/task.ts#L111)

Attach a directory's conventions file to the first `read` under it, once
per directory per session (see ./dir-conventions.ts). Defaults to `true`.

***

### spillDir

> **spillDir**: `string`

Defined in: [packages/agent-sdk/src/task.ts:106](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/task.ts#L106)

Where oversized grep/webfetch output spills (the parent's spill dir).

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:104](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/task.ts#L104)

What tool descriptions call the workspace. Defaults to "workspace".

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/task.ts:102](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/task.ts#L102)

Directory the child works in; tools refuse paths that escape it.
