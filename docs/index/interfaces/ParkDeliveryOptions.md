[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkDeliveryOptions

# Interface: ParkDeliveryOptions

Defined in: [packages/agent-sdk/src/hooks.ts:89](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/hooks.ts#L89)

Options for the park-delivery hook that sends queued media/notes/steers on session parks.

## Properties

### log?

> `optional` **log?**: `boolean`

Defined in: [packages/agent-sdk/src/hooks.ts:96](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/hooks.ts#L96)

Log a line per delivery/failure (default true — it explains agent turns).

***

### serverUrl?

> `optional` **serverUrl?**: `string`

Defined in: [packages/agent-sdk/src/hooks.ts:94](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/hooks.ts#L94)

Base URL of this agent's own eve server. Defaults to loopback on the
server's port (`$PORT`, eve dev's default 2000 otherwise).

***

### steer?

> `optional` **steer?**: `object`

Defined in: [packages/agent-sdk/src/hooks.ts:102](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/hooks.ts#L102)

The steer inbox dir (the same one passed to `createStdlib`). When set,
steered messages a turn ends before delivering (no tool completed after
they arrived) go out on park as the next user turn.

#### dir

> **dir**: `string`
