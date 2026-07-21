[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state](../README.md) / SuggestedStateDefaults

# Interface: SuggestedStateDefaults

Defined in: [packages/agent-sdk/src/state.ts:31](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/state.ts#L31)

The author's preferred engine/partition/lifecycle, consumed at rung two of
the binding resolution ladder. Hints, not constraints.

## Properties

### engine?

> `readonly` `optional` **engine?**: `string`

Defined in: [packages/agent-sdk/src/state.ts:33](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/state.ts#L33)

Engine catalog key, e.g. "zo-blob-r2". Free-form: the catalog is control-plane code.

***

### lifecycle?

> `readonly` `optional` **lifecycle?**: `Readonly`\<`Record`\<`string`, `string` \| `number` \| `boolean`\>\>

Defined in: [packages/agent-sdk/src/state.ts:36](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/state.ts#L36)

Per-transition lifecycle overrides on the (engine, partition) defaults.

***

### partition?

> `readonly` `optional` **partition?**: [`StatePartition`](../type-aliases/StatePartition.md)

Defined in: [packages/agent-sdk/src/state.ts:34](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/state.ts#L34)
