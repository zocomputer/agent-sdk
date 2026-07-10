[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createParkDeliveryState

# Function: createParkDeliveryState()

> **createParkDeliveryState**\<`T`\>(): `object`

Defined in: [packages/agent-sdk/src/park-delivery.ts:75](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/park-delivery.ts#L75)

Per-process delivery state across sessions. Feed it every stream event via
`observe`; queue items with `enqueue` or `enqueueAll`. Either returns a
request exactly when a parked, reachable session has items to deliver. The
caller performs the send and reports back with `settle` — on failure the
items re-queue. Dedup is by item key for the session's lifetime in this
process, so an item never delivers twice even if a failed send races a user
message.

## Type Parameters

### T

`T`

## Returns

### enqueueAll

> **enqueueAll**: (`sessionId`, `items`) => [`ParkDeliveryRequest`](../interfaces/ParkDeliveryRequest.md)\<`T`\> \| `null`

Queue several items at once — all enter pending before any drain, so a
batch enqueued into an already-parked session goes out as one delivery.

Queue several items at once — all of them enter pending before any drain,
so a batch enqueued into an already-parked session goes out as one
delivery. Enqueuing the same batch item-by-item would let the first
item's immediate flush strand the rest into a second turn.

#### Parameters

##### sessionId

`string`

##### items

readonly [`ParkDeliveryItem`](../interfaces/ParkDeliveryItem.md)\<`T`\>[]

#### Returns

[`ParkDeliveryRequest`](../interfaces/ParkDeliveryRequest.md)\<`T`\> \| `null`

### enqueue()

> **enqueue**(`sessionId`, `item`): [`ParkDeliveryRequest`](../interfaces/ParkDeliveryRequest.md)\<`T`\> \| `null`

Queue an item for a session. Returns a request immediately when the
session is currently parked and reachable — the caller must perform
that send (no later stream event will fire to flush it). An item whose
key was already delivered (or is already pending) is dropped.

#### Parameters

##### sessionId

`string`

##### item

[`ParkDeliveryItem`](../interfaces/ParkDeliveryItem.md)\<`T`\>

#### Returns

[`ParkDeliveryRequest`](../interfaces/ParkDeliveryRequest.md)\<`T`\> \| `null`

### observe()

> **observe**(`event`, `meta`): [`ParkDeliveryRequest`](../interfaces/ParkDeliveryRequest.md)\<`T`\> \| `null`

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

[`ParkDeliveryRequest`](../interfaces/ParkDeliveryRequest.md)\<`T`\> \| `null`

### settle()

> **settle**(`request`, `ok`): [`ParkDeliveryRequest`](../interfaces/ParkDeliveryRequest.md)\<`T`\> \| `null`

Report the send outcome. A failed send re-queues for the next park.
Returns a new request when items queued during the just-finished delivery
need immediate dispatch (the session is still parked).

#### Parameters

##### request

[`ParkDeliveryRequest`](../interfaces/ParkDeliveryRequest.md)\<`T`\>

##### ok

`boolean`

#### Returns

[`ParkDeliveryRequest`](../interfaces/ParkDeliveryRequest.md)\<`T`\> \| `null`
