[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ALWAYS\_IGNORED

# Variable: ALWAYS\_IGNORED

> `const` **ALWAYS\_IGNORED**: `Set`\<`string`\>

Defined in: [packages/agent-sdk/src/walk.ts:6](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/walk.ts#L6)

VCS stores and dependency dirs unconditionally skipped by the fallback walk — git's ignore semantics are preferred, but this ensures we never flood into huge dirs even in non-git trees. Exported so the sandbox search backend applies the same skips.
