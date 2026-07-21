[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / walkFiles

# Function: walkFiles()

> **walkFiles**(`root`, `base?`): `Generator`\<`string`\>

Defined in: [packages/agent-sdk/src/walk.ts:54](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/walk.ts#L54)

Depth-first walk yielding base-relative, forward-slash file paths, honoring gitignore semantics. Modest by design — it exists to serve interactive searches, not to index the world.

## Parameters

### root

`string`

### base?

`string` = `root`

## Returns

`Generator`\<`string`\>
