[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TaskToolManifestOptions

# Interface: TaskToolManifestOptions

Defined in: [packages/agent-sdk/src/task.ts:45](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/task.ts#L45)

Options for `expectedTaskToolNames`: the parent's authored tool names and
the subset deliberately excluded from the child. A typo in the exclusion
list would silently weaken the manifest guard, so it throws on bad names.

## Properties

### excludedParentTools?

> `optional` **excludedParentTools?**: readonly `string`[]

Defined in: [packages/agent-sdk/src/task.ts:58](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/task.ts#L58)

Parent tools deliberately not re-exported into the child — the
parent-session/cockpit-coupled ones (e.g. a tool that queues messages
into the parent's own chat). Every entry must name a real parent tool;
a typo here would silently weaken the manifest guard, so it throws.

***

### parentToolNames

> **parentToolNames**: readonly `string`[]

Defined in: [packages/agent-sdk/src/task.ts:51](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/task.ts#L51)

The parent's authored tool names — file names (without `.ts`) under the
parent's `agent/tools/`, disable shims included (re-exporting a parent
shim keeps the vacated name vacated in the child too).
