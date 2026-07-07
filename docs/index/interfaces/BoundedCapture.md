[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / BoundedCapture

# Interface: BoundedCapture

Defined in: [packages/agent-sdk/src/bounded-output.ts:39](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/bounded-output.ts#L39)

A growing stream capture that keeps head + tail in-memory and spills the
complete output to a file on first overflow.

## Methods

### append()

> **append**(`chunk`): `void`

Defined in: [packages/agent-sdk/src/bounded-output.ts:41](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/bounded-output.ts#L41)

Add a chunk to the capture; updates head/tail/spill accordingly.

#### Parameters

##### chunk

`string`

#### Returns

`void`

***

### latest()

> **latest**(): `string`

Defined in: [packages/agent-sdk/src/bounded-output.ts:45](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/bounded-output.ts#L45)

The most recent text we hold: the whole output until overflow, the rolling tail after.

#### Returns

`string`

***

### snapshot()

> **snapshot**(): [`CaptureSnapshot`](CaptureSnapshot.md)

Defined in: [packages/agent-sdk/src/bounded-output.ts:43](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/bounded-output.ts#L43)

Point-in-time snapshot of bounded text, total chars, truncation, and spill path.

#### Returns

[`CaptureSnapshot`](CaptureSnapshot.md)

***

### totalChars()

> **totalChars**(): `number`

Defined in: [packages/agent-sdk/src/bounded-output.ts:47](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/bounded-output.ts#L47)

Total characters appended so far.

#### Returns

`number`
