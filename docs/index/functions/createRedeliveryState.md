[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createRedeliveryState

# Function: createRedeliveryState()

> **createRedeliveryState**(): `object`

Defined in: [packages/agent-sdk/src/redeliver.ts:99](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/redeliver.ts#L99)

Per-process redelivery state across sessions: the generic park-delivery
state machine specialized to read-media attachments. Feed it every stream
event via `observe`; it returns a `RedeliveryRequest` exactly when a parked
session has media to deliver. The caller performs the send and reports back
with `settle` — on failure the media re-queue for the session's next park.

Dedup is by tool call id for the session's lifetime in this process, so an
attachment never delivers twice even if a failed send races a user message.

## Returns

### observe()

> **observe**(`event`, `meta`): [`RedeliveryRequest`](../interfaces/RedeliveryRequest.md) \| `null`

Consume one stream event. `continuationToken` is the hook's runtime
(namespaced) token when known — latest wins; it's translated to the
client-facing token the continue route accepts.

#### Parameters

##### event

`unknown`

##### meta

###### continuationToken?

`string`

###### sessionId

`string`

#### Returns

[`RedeliveryRequest`](../interfaces/RedeliveryRequest.md) \| `null`

### settle()

> **settle**(`request`, `ok`): `void`

Report the send outcome; a failed send re-queues for the next park.

#### Parameters

##### request

[`RedeliveryRequest`](../interfaces/RedeliveryRequest.md)

##### ok

`boolean`

#### Returns

`void`
