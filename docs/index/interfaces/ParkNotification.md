[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkNotification

# Interface: ParkNotification

Defined in: [packages/agent-sdk/src/park-delivery.ts:203](https://github.com/zocomputer/zov2-code/blob/ca3547b2cec605405cb2885ac6f0edc660b55992/packages/agent-sdk/src/park-delivery.ts#L203)

A background notification for the model, delivered as its next user turn.

## Properties

### key

> `readonly` **key**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:205](https://github.com/zocomputer/zov2-code/blob/ca3547b2cec605405cb2885ac6f0edc660b55992/packages/agent-sdk/src/park-delivery.ts#L205)

Dedupe key (e.g. `task_3#2`); one delivery per key per session.

***

### text

> `readonly` **text**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:207](https://github.com/zocomputer/zov2-code/blob/ca3547b2cec605405cb2885ac6f0edc660b55992/packages/agent-sdk/src/park-delivery.ts#L207)

The message text, complete and self-describing.
