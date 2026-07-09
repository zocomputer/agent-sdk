[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / editNotFoundHint

# Function: editNotFoundHint()

> **editNotFoundHint**(`content`, `oldString`): [`EditNotFoundHint`](../interfaces/EditNotFoundHint.md) \| `null`

Defined in: [packages/agent-sdk/src/edit-match.ts:591](https://github.com/zocomputer/zov2-code/blob/a259f6f3d345009ac90c86d9f10d9171b99736b9/packages/agent-sdk/src/edit-match.ts#L591)

Locate the region of `content` the model probably meant when `oldString`
failed every replacer, so the not-found error can point instead of just
refusing — a targeted preview turns the most expensive tool failure
(re-read the whole file, reconstruct, retry) into a one-shot correction.
Anchor: `oldString`'s first non-empty trimmed line, matched by substring
containment either way (goose's rule), then by best trimmed-line
Levenshtein similarity at ≥ 0.6. `null` when nothing plausibly matches
(the honest answer — a wrong hint is worse than none).

## Parameters

### content

`string`

### oldString

`string`

## Returns

[`EditNotFoundHint`](../interfaces/EditNotFoundHint.md) \| `null`
