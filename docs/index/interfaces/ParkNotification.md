[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkNotification

# Interface: ParkNotification

Defined in: [packages/agent-sdk/src/park-delivery.ts:210](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/park-delivery.ts#L210)

A background notification for the model, delivered as its next user turn.

## Properties

### key

> `readonly` **key**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:212](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/park-delivery.ts#L212)

Dedupe key (e.g. `task_3#2`); one delivery per key per session.

***

### text

> `readonly` **text**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:214](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/park-delivery.ts#L214)

The message text, complete and self-describing.
