[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / CaptureSnapshot

# Interface: CaptureSnapshot

Defined in: [packages/agent-sdk/src/bounded-output.ts:26](https://github.com/zocomputer/zov2-code/blob/2004eea2e2488195525555d1ec03711235aadc63/packages/agent-sdk/src/bounded-output.ts#L26)

Point-in-time capture snapshot: bounded text (head + marker + tail when
truncated), total character count, truncation flag, and the spill file path.

## Properties

### spillPath

> `readonly` **spillPath**: `string` \| `null`

Defined in: [packages/agent-sdk/src/bounded-output.ts:32](https://github.com/zocomputer/zov2-code/blob/2004eea2e2488195525555d1ec03711235aadc63/packages/agent-sdk/src/bounded-output.ts#L32)

Absolute path of the complete output, when spilled successfully.

***

### text

> `readonly` **text**: `string`

Defined in: [packages/agent-sdk/src/bounded-output.ts:28](https://github.com/zocomputer/zov2-code/blob/2004eea2e2488195525555d1ec03711235aadc63/packages/agent-sdk/src/bounded-output.ts#L28)

Bounded text; when truncated, head + a marker naming the spill file + tail.

***

### totalChars

> `readonly` **totalChars**: `number`

Defined in: [packages/agent-sdk/src/bounded-output.ts:29](https://github.com/zocomputer/zov2-code/blob/2004eea2e2488195525555d1ec03711235aadc63/packages/agent-sdk/src/bounded-output.ts#L29)

***

### truncated

> `readonly` **truncated**: `boolean`

Defined in: [packages/agent-sdk/src/bounded-output.ts:30](https://github.com/zocomputer/zov2-code/blob/2004eea2e2488195525555d1ec03711235aadc63/packages/agent-sdk/src/bounded-output.ts#L30)
