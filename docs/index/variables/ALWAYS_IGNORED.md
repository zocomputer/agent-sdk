[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ALWAYS\_IGNORED

# Variable: ALWAYS\_IGNORED

> `const` **ALWAYS\_IGNORED**: `Set`\<`string`\>

Defined in: [packages/agent-sdk/src/walk.ts:6](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/walk.ts#L6)

VCS stores and dependency dirs unconditionally skipped by the fallback walk — git's ignore semantics are preferred, but this ensures we never flood into huge dirs even in non-git trees. Exported so the sandbox search backend applies the same skips.
