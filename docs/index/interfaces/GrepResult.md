[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / GrepResult

# Interface: GrepResult

Defined in: [packages/agent-sdk/src/tools/grep.ts:33](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/tools/grep.ts#L33)

The tool's result shape, uniform across the complete/capped/spilled paths.

## Properties

### count

> **count**: `number`

Defined in: [packages/agent-sdk/src/tools/grep.ts:35](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/tools/grep.ts#L35)

***

### matches

> **matches**: `object`[]

Defined in: [packages/agent-sdk/src/tools/grep.ts:37](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/tools/grep.ts#L37)

#### file

> **file**: `string`

#### line

> **line**: `number`

#### text

> **text**: `string`

***

### note?

> `optional` **note?**: `string`

Defined in: [packages/agent-sdk/src/tools/grep.ts:41](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/tools/grep.ts#L41)

***

### pattern

> **pattern**: `string`

Defined in: [packages/agent-sdk/src/tools/grep.ts:34](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/tools/grep.ts#L34)

***

### skippedLargeFiles?

> `optional` **skippedLargeFiles?**: `number`

Defined in: [packages/agent-sdk/src/tools/grep.ts:39](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/tools/grep.ts#L39)

Absent when the backend can't count size-skipped files (remote search).

***

### totalMatches?

> `optional` **totalMatches?**: `number`

Defined in: [packages/agent-sdk/src/tools/grep.ts:40](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/tools/grep.ts#L40)

***

### truncated

> **truncated**: `boolean`

Defined in: [packages/agent-sdk/src/tools/grep.ts:36](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/tools/grep.ts#L36)
