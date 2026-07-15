[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / renderTruncationMarker

# Function: renderTruncationMarker()

> **renderTruncationMarker**(`opts`): `string`

Defined in: [packages/agent-sdk/src/bounded-output.ts:46](https://github.com/zocomputer/zov2-code/blob/492659e3281a9b9d11501446d7ec2e941b7da162/packages/agent-sdk/src/bounded-output.ts#L46)

Render the in-text truncation marker for a bounded capture. Exported so
runners that assemble `head + marker + tail` themselves (the sandbox
runner, which learns its spill label only after the command settles) emit
the exact marker the local capture does.

## Parameters

### opts

#### headChars

`number`

Characters actually shown in the head slice.

#### label?

`string`

Where the complete output lives (e.g. a workspace-relative path); omit when it wasn't kept.

#### tailChars

`number`

Characters actually shown in the tail slice.

#### totalChars

`number`

Total characters the command produced.

## Returns

`string`
