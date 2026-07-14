[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / isDisproportionateMatch

# Function: isDisproportionateMatch()

> **isDisproportionateMatch**(`search`, `oldString`): `boolean`

Defined in: [packages/agent-sdk/src/edit-match.ts:472](https://github.com/zocomputer/zov2-code/blob/a7b5fa23defbcd3c7af6fb49008f7b280d46c09e/packages/agent-sdk/src/edit-match.ts#L472)

The safety valve that makes an aggressive cascade shippable: a fuzzy
strategy that "matches" a span wildly larger than what the model asked to
replace must refuse instead of splicing half the file. Thresholds verbatim
from opencode: 3+ extra lines (or 2x the lines), or — for multi-line
old_strings — trimmed length beyond `max(+500 chars, 4x)`.

## Parameters

### search

`string`

### oldString

`string`

## Returns

`boolean`
