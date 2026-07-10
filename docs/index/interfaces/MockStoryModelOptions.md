[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MockStoryModelOptions

# Interface: MockStoryModelOptions

Defined in: [packages/agent-sdk/src/mock-model.ts:38](https://github.com/zocomputer/zov2-code/blob/0e648df1796b1446eeb67f62d6e2274440971464/packages/agent-sdk/src/mock-model.ts#L38)

Configuration for the slow-streaming mock model's behavior: how long each
story turn runs, how many deltas a burst emits, which subagent tool
`[mock:delegate]` calls, and the clock for deterministic test streams.

## Properties

### burstChunks?

> `optional` **burstChunks?**: `number`

Defined in: [packages/agent-sdk/src/mock-model.ts:44](https://github.com/zocomputer/zov2-code/blob/0e648df1796b1446eeb67f62d6e2274440971464/packages/agent-sdk/src/mock-model.ts#L44)

Deltas for a `[mock:burst]` turn (no pacing). Default 600.

***

### chunkCount?

> `optional` **chunkCount?**: `number`

Defined in: [packages/agent-sdk/src/mock-model.ts:40](https://github.com/zocomputer/zov2-code/blob/0e648df1796b1446eeb67f62d6e2274440971464/packages/agent-sdk/src/mock-model.ts#L40)

Text deltas per story turn. Default 240 (~60s at the default delay).

***

### chunkDelayMs?

> `optional` **chunkDelayMs?**: `number`

Defined in: [packages/agent-sdk/src/mock-model.ts:42](https://github.com/zocomputer/zov2-code/blob/0e648df1796b1446eeb67f62d6e2274440971464/packages/agent-sdk/src/mock-model.ts#L42)

Delay between deltas in ms. Default 250.

***

### delegateToolName?

> `optional` **delegateToolName?**: `string`

Defined in: [packages/agent-sdk/src/mock-model.ts:46](https://github.com/zocomputer/zov2-code/blob/0e648df1796b1446eeb67f62d6e2274440971464/packages/agent-sdk/src/mock-model.ts#L46)

The declared subagent tool `[mock:delegate]` delegates to. Default "task_fast".

***

### now?

> `optional` **now?**: () => `number`

Defined in: [packages/agent-sdk/src/mock-model.ts:51](https://github.com/zocomputer/zov2-code/blob/0e648df1796b1446eeb67f62d6e2274440971464/packages/agent-sdk/src/mock-model.ts#L51)

Clock for response-metadata ids/timestamps. Default `Date.now`. Inject a
fixed clock to make the full stream byte-deterministic across runs.

#### Returns

`number`
