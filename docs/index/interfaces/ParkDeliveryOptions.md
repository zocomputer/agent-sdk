[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkDeliveryOptions

# Interface: ParkDeliveryOptions

Defined in: [packages/agent-sdk/src/hooks.ts:74](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/hooks.ts#L74)

Options for the park-delivery hook that sends queued notifications and steers on session parks.

## Properties

### log?

> `optional` **log?**: `boolean`

Defined in: [packages/agent-sdk/src/hooks.ts:81](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/hooks.ts#L81)

Log a line per delivery/failure (default true — it explains agent turns).

***

### serverUrl?

> `optional` **serverUrl?**: `string`

Defined in: [packages/agent-sdk/src/hooks.ts:79](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/hooks.ts#L79)

Base URL of this agent's own eve server. Defaults to loopback on the
server's port (`$PORT`, eve dev's default 2000 otherwise).

***

### steer?

> `optional` **steer?**: `object`

Defined in: [packages/agent-sdk/src/hooks.ts:87](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/hooks.ts#L87)

The steer inbox dir (the same one passed to `createStdlib`). When set,
steered messages a turn ends before delivering (no tool completed after
they arrived) go out on park as the next user turn.

#### dir

> **dir**: `string`
