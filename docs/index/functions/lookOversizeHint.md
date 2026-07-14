[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / lookOversizeHint

# Function: lookOversizeHint()

> **lookOversizeHint**(`oracle`, `maxInputBytes?`): `string` \| `undefined`

Defined in: [packages/agent-sdk/src/tools/look.ts:424](https://github.com/zocomputer/zov2-code/blob/2f6c8cc3fd1672c6cd6d12c28dbf229ac82949b0/packages/agent-sdk/src/tools/look.ts#L424)

`read`'s file-too-large hint when a look oracle is wired. `read` rejects
files over its byte cap (~10 MB) before kind detection, but `look` sends up
to `maxInputBytes` (default [DEFAULT\_LOOK\_MAX\_INPUT\_BYTES](../variables/DEFAULT_LOOK_MAX_INPUT_BYTES.md), 20 MiB) —
a media file in that band is reachable only through `look`, so the oversize
error must say so. Because the error fires before kind detection, the hint
leads with the text route and names the EXACT kinds `look` takes (a bare
"media file" invites misrouting a large text file into look's refusal) and
look's cap (a file above it must not bounce between two refusals).
`undefined` when the oracle views nothing.

## Parameters

### oracle

[`LookOracleConfig`](../interfaces/LookOracleConfig.md)

### maxInputBytes?

`number` = `DEFAULT_LOOK_MAX_INPUT_BYTES`

## Returns

`string` \| `undefined`
