[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TaskChildToolsOptions

# Interface: TaskChildToolsOptions

Defined in: [packages/agent-sdk/src/task.ts:107](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/task.ts#L107)

Options for `createTaskChildTools`: workspace root the child is confined to,
where oversized output spills, and whether to inject directory conventions
on first read.

## Properties

### conventionsFileName?

> `optional` **conventionsFileName?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:120](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/task.ts#L120)

Conventions filename the read riders look for. Defaults to "AGENTS.md".

***

### injectDirConventions?

> `optional` **injectDirConventions?**: `boolean`

Defined in: [packages/agent-sdk/src/task.ts:118](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/task.ts#L118)

Attach a directory's conventions file to the first `read` under it, once
per directory per session (see ./dir-conventions.ts). Defaults to `true`.

***

### mediaOracle?

> `optional` **mediaOracle?**: [`MediaOracleOption`](../type-aliases/MediaOracleOption.md)

Defined in: [packages/agent-sdk/src/task.ts:134](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/task.ts#L134)

The parent's look oracle, when it wires one. A task child re-exports the
parent's `look` like any other tool (it needs no park delivery, so it
works in children), and with this set the child's read/webfetch
unavailable-media hints route to `look` instead of "report the path".

Pass the parent stdlib's RESOLVED oracle — `stdlib.mediaOracle` — not an
independent option: the hints derive from this config while the `look`
tool itself is the parent's instance, so a mismatched value (e.g. `true`
here against a custom oracle on the parent) would advertise a model and
capability set the child's `look` doesn't run. `true` (the SDK default
oracle) is only correct when the parent also used `true`.

***

### spillDir

> **spillDir**: `string`

Defined in: [packages/agent-sdk/src/task.ts:113](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/task.ts#L113)

Where oversized grep/webfetch output spills (the parent's spill dir).

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:111](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/task.ts#L111)

What tool descriptions call the workspace. Defaults to "workspace".

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/task.ts:109](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/task.ts#L109)

Directory the child works in; tools refuse paths that escape it.
