[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ALWAYS\_IGNORED

# Variable: ALWAYS\_IGNORED

> `const` **ALWAYS\_IGNORED**: `Set`\<`string`\>

Defined in: [packages/agent-sdk/src/walk.ts:6](https://github.com/zocomputer/zov2-code/blob/b7f06ca2cf0142cf87a67d683e96ae88d6c29abe/packages/agent-sdk/src/walk.ts#L6)

VCS stores and dependency dirs unconditionally skipped by the fallback walk — git's ignore semantics are preferred, but this ensures we never flood into huge dirs even in non-git trees. Exported so the sandbox search backend applies the same skips.
