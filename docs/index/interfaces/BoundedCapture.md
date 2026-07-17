[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / BoundedCapture

# Interface: BoundedCapture

Defined in: [packages/agent-sdk/src/bounded-output.ts:64](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/bounded-output.ts#L64)

A growing stream capture that keeps head + tail in-memory and spills the
complete output to a file on first overflow.

## Methods

### append()

> **append**(`chunk`): `void`

Defined in: [packages/agent-sdk/src/bounded-output.ts:66](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/bounded-output.ts#L66)

Add a chunk to the capture; updates head/tail/spill accordingly.

#### Parameters

##### chunk

`string`

#### Returns

`void`

***

### latest()

> **latest**(): `string`

Defined in: [packages/agent-sdk/src/bounded-output.ts:70](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/bounded-output.ts#L70)

The most recent text we hold: the whole output until overflow, the rolling tail after.

#### Returns

`string`

***

### snapshot()

> **snapshot**(): [`CaptureSnapshot`](CaptureSnapshot.md)

Defined in: [packages/agent-sdk/src/bounded-output.ts:68](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/bounded-output.ts#L68)

Point-in-time snapshot of bounded text, total chars, truncation, and spill path.

#### Returns

[`CaptureSnapshot`](CaptureSnapshot.md)

***

### totalChars()

> **totalChars**(): `number`

Defined in: [packages/agent-sdk/src/bounded-output.ts:72](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/bounded-output.ts#L72)

Total characters appended so far.

#### Returns

`number`
