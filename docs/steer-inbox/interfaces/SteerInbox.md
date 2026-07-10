[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [steer-inbox](../README.md) / SteerInbox

# Interface: SteerInbox

Defined in: [packages/agent-sdk/src/steer-inbox.ts:32](https://github.com/zocomputer/zov2-code/blob/2ecdaafb938b2184f882642908beb7b52901cb28/packages/agent-sdk/src/steer-inbox.ts#L32)

A per-session NDJSON file queue for steered messages, with race-safe drain.

## Methods

### append()

> **append**(`sessionId`, `text`): [`SteerMessage`](../../steer/interfaces/SteerMessage.md)

Defined in: [packages/agent-sdk/src/steer-inbox.ts:34](https://github.com/zocomputer/zov2-code/blob/2ecdaafb938b2184f882642908beb7b52901cb28/packages/agent-sdk/src/steer-inbox.ts#L34)

Queue a new steered message for a session; returns the stored message.

#### Parameters

##### sessionId

`string`

##### text

`string`

#### Returns

[`SteerMessage`](../../steer/interfaces/SteerMessage.md)

***

### appendMessage()

> **appendMessage**(`sessionId`, `message`): `void`

Defined in: [packages/agent-sdk/src/steer-inbox.ts:36](https://github.com/zocomputer/zov2-code/blob/2ecdaafb938b2184f882642908beb7b52901cb28/packages/agent-sdk/src/steer-inbox.ts#L36)

Re-queue an existing message (failed delivery), keeping its id and time.

#### Parameters

##### sessionId

`string`

##### message

[`SteerMessage`](../../steer/interfaces/SteerMessage.md)

#### Returns

`void`

***

### drain()

> **drain**(`sessionId`): [`SteerMessage`](../../steer/interfaces/SteerMessage.md)[]

Defined in: [packages/agent-sdk/src/steer-inbox.ts:38](https://github.com/zocomputer/zov2-code/blob/2ecdaafb938b2184f882642908beb7b52901cb28/packages/agent-sdk/src/steer-inbox.ts#L38)

Take every queued message for a session; `[]` when none are queued.

#### Parameters

##### sessionId

`string`

#### Returns

[`SteerMessage`](../../steer/interfaces/SteerMessage.md)[]
