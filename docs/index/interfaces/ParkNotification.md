[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkNotification

# Interface: ParkNotification

Defined in: [packages/agent-sdk/src/park-delivery.ts:209](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/park-delivery.ts#L209)

A background notification for the model, delivered as its next user turn.

## Properties

### key

> `readonly` **key**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:211](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/park-delivery.ts#L211)

Dedupe key (e.g. `task_3#2`); one delivery per key per session.

***

### text

> `readonly` **text**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:213](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/park-delivery.ts#L213)

The message text, complete and self-describing.
