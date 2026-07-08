[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MockStoryModelOptions

# Interface: MockStoryModelOptions

Defined in: [packages/agent-sdk/src/mock-model.ts:29](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/mock-model.ts#L29)

Configuration for the slow-streaming mock model's behavior: how long each
story turn runs, how many deltas a burst emits, which subagent tool
`[mock:delegate]` calls, and the clock for deterministic test streams.

## Properties

### burstChunks?

> `optional` **burstChunks?**: `number`

Defined in: [packages/agent-sdk/src/mock-model.ts:35](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/mock-model.ts#L35)

Deltas for a `[mock:burst]` turn (no pacing). Default 600.

***

### chunkCount?

> `optional` **chunkCount?**: `number`

Defined in: [packages/agent-sdk/src/mock-model.ts:31](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/mock-model.ts#L31)

Text deltas per story turn. Default 240 (~60s at the default delay).

***

### chunkDelayMs?

> `optional` **chunkDelayMs?**: `number`

Defined in: [packages/agent-sdk/src/mock-model.ts:33](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/mock-model.ts#L33)

Delay between deltas in ms. Default 250.

***

### delegateToolName?

> `optional` **delegateToolName?**: `string`

Defined in: [packages/agent-sdk/src/mock-model.ts:37](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/mock-model.ts#L37)

The declared subagent tool `[mock:delegate]` delegates to. Default "task_fast".

***

### now?

> `optional` **now?**: () => `number`

Defined in: [packages/agent-sdk/src/mock-model.ts:42](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/mock-model.ts#L42)

Clock for response-metadata ids/timestamps. Default `Date.now`. Inject a
fixed clock to make the full stream byte-deterministic across runs.

#### Returns

`number`
