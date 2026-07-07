[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [steer](../README.md) / SteerMessage

# Interface: SteerMessage

Defined in: [packages/agent-sdk/src/steer.ts:26](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/steer.ts#L26)

One steered message, as queued by a UI and delivered to the model.

## Properties

### at

> **at**: `number`

Defined in: [packages/agent-sdk/src/steer.ts:32](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/steer.ts#L32)

Queue time (epoch ms).

***

### id

> **id**: `string`

Defined in: [packages/agent-sdk/src/steer.ts:28](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/steer.ts#L28)

Unique id — the park-delivery dedupe key (`steer:<id>`).

***

### text

> **text**: `string`

Defined in: [packages/agent-sdk/src/steer.ts:30](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/steer.ts#L30)

The user's message, verbatim.
