[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createBoundedCapture

# Function: createBoundedCapture()

> **createBoundedCapture**(`opts?`): [`BoundedCapture`](../interfaces/BoundedCapture.md)

Defined in: [packages/agent-sdk/src/bounded-output.ts:73](https://github.com/zocomputer/zov2-code/blob/e246fc7c6576db819f4636c288ce8b7c7818f506/packages/agent-sdk/src/bounded-output.ts#L73)

Create a bounded stream capture: keeps head + tail in-memory (within the
caps) and, on first overflow, spills the complete output to a file. Handles
surrogate pairs carefully so slices never land inside one.

## Parameters

### opts?

#### headChars?

`number`

#### spillLabel?

`string`

How the marker names the spill file (e.g. repo-relative path). Defaults to `spillPath`.

#### spillPath?

`string`

Absolute file path for the complete output; created lazily on first overflow. Omit to disable spilling.

#### tailChars?

`number`

## Returns

[`BoundedCapture`](../interfaces/BoundedCapture.md)
