[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [steer](../README.md) / SteerMessage

# Interface: SteerMessage

Defined in: [packages/agent-sdk/src/steer.ts:26](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/steer.ts#L26)

One steered message, as queued by a UI and delivered to the model.

## Properties

### at

> **at**: `number`

Defined in: [packages/agent-sdk/src/steer.ts:32](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/steer.ts#L32)

Queue time (epoch ms).

***

### id

> **id**: `string`

Defined in: [packages/agent-sdk/src/steer.ts:28](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/steer.ts#L28)

Unique id — the park-delivery dedupe key (`steer:<id>`).

***

### text

> **text**: `string`

Defined in: [packages/agent-sdk/src/steer.ts:30](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/steer.ts#L30)

The user's message, verbatim.
