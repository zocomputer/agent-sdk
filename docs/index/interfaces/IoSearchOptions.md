[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / IoSearchOptions

# Interface: IoSearchOptions

Defined in: [packages/agent-sdk/src/workspace-io.ts:41](https://github.com/zocomputer/zov2-code/blob/f95a48c7e1f1a7b1961c045374fb5540573a3627/packages/agent-sdk/src/workspace-io.ts#L41)

Content-search parameters: regex pattern, case-sensitivity, scope, glob
filter, and max-match bound.

## Properties

### glob?

> `readonly` `optional` **glob?**: `string`

Defined in: [packages/agent-sdk/src/workspace-io.ts:51](https://github.com/zocomputer/zov2-code/blob/f95a48c7e1f1a7b1961c045374fb5540573a3627/packages/agent-sdk/src/workspace-io.ts#L51)

Filename glob filter over root-relative paths (e.g. `**​/*.ts`).

***

### ignoreCase

> `readonly` **ignoreCase**: `boolean`

Defined in: [packages/agent-sdk/src/workspace-io.ts:44](https://github.com/zocomputer/zov2-code/blob/f95a48c7e1f1a7b1961c045374fb5540573a3627/packages/agent-sdk/src/workspace-io.ts#L44)

***

### maxMatches

> `readonly` **maxMatches**: `number`

Defined in: [packages/agent-sdk/src/workspace-io.ts:53](https://github.com/zocomputer/zov2-code/blob/f95a48c7e1f1a7b1961c045374fb5540573a3627/packages/agent-sdk/src/workspace-io.ts#L53)

Stop scanning once this many matching lines have been collected.

***

### pattern

> `readonly` **pattern**: `string`

Defined in: [packages/agent-sdk/src/workspace-io.ts:43](https://github.com/zocomputer/zov2-code/blob/f95a48c7e1f1a7b1961c045374fb5540573a3627/packages/agent-sdk/src/workspace-io.ts#L43)

JavaScript regex source. The tool validates it before calling.

***

### scope?

> `readonly` `optional` **scope?**: `string`

Defined in: [packages/agent-sdk/src/workspace-io.ts:49](https://github.com/zocomputer/zov2-code/blob/f95a48c7e1f1a7b1961c045374fb5540573a3627/packages/agent-sdk/src/workspace-io.ts#L49)

Absolute file or directory to search. The whole workspace when omitted.
Callers stat the scope first, so it exists.
