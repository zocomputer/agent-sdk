[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / replaceForgiving

# Function: replaceForgiving()

> **replaceForgiving**(`content`, `oldString`, `newString`, `replaceAll?`): [`ForgivingReplaceResult`](../interfaces/ForgivingReplaceResult.md)

Defined in: [packages/agent-sdk/src/edit-match.ts:492](https://github.com/zocomputer/zov2-code/blob/d124383bcfcf0ca6d96b92bff96fa6dfccc07562/packages/agent-sdk/src/edit-match.ts#L492)

Resolve `oldString` to a span of `content` via the replacer cascade and
replace it with `newString`.

Semantics (opencode's `replace()`): try each replacer in order; for each
candidate span it yields, the candidate must occur in the content, pass
the disproportionate-match guard, and — unless `replaceAll` — occur
exactly once. `replaceAll` replaces every occurrence of the first found
candidate. Throws [EditNotFoundError](../classes/EditNotFoundError.md), [EditNotUniqueError](../classes/EditNotUniqueError.md),
or [EditDisproportionateError](../classes/EditDisproportionateError.md); plain `Error` for the identical /
empty `oldString` preconditions.

## Parameters

### content

`string`

### oldString

`string`

### newString

`string`

### replaceAll?

`boolean` = `false`

## Returns

[`ForgivingReplaceResult`](../interfaces/ForgivingReplaceResult.md)
