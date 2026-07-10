[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / CaptureSnapshot

# Interface: CaptureSnapshot

Defined in: [packages/agent-sdk/src/bounded-output.ts:27](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/bounded-output.ts#L27)

Point-in-time capture snapshot: bounded text (head + marker + tail when
truncated), the raw head/tail slices, total character count, truncation
flag, and the spill file path.

## Properties

### head

> `readonly` **head**: `string`

Defined in: [packages/agent-sdk/src/bounded-output.ts:31](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/bounded-output.ts#L31)

The head slice alone (the complete text when not truncated).

***

### spillPath

> `readonly` **spillPath**: `string` \| `null`

Defined in: [packages/agent-sdk/src/bounded-output.ts:37](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/bounded-output.ts#L37)

Absolute path of the complete output, when spilled successfully.

***

### tail

> `readonly` **tail**: `string`

Defined in: [packages/agent-sdk/src/bounded-output.ts:33](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/bounded-output.ts#L33)

The tail slice alone; empty until the capture overflows.

***

### text

> `readonly` **text**: `string`

Defined in: [packages/agent-sdk/src/bounded-output.ts:29](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/bounded-output.ts#L29)

Bounded text; when truncated, head + a marker naming the spill file + tail.

***

### totalChars

> `readonly` **totalChars**: `number`

Defined in: [packages/agent-sdk/src/bounded-output.ts:34](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/bounded-output.ts#L34)

***

### truncated

> `readonly` **truncated**: `boolean`

Defined in: [packages/agent-sdk/src/bounded-output.ts:35](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/bounded-output.ts#L35)
