[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createLookTool

# Function: createLookTool()

> **createLookTool**(`opts`): `ToolDefinition`\<\{ `path`: `string`; `prompt`: `string`; \}, \{ `answer`: `string`; `media_type`: `string`; `model`: `string`; `path`: `string`; \}\>

Defined in: [packages/agent-sdk/src/tools/look.ts:193](https://github.com/zocomputer/zov2-code/blob/e7fb39c35601ce5ee40494fbfe469df1f7a9ecc4/packages/agent-sdk/src/tools/look.ts#L193)

Build the `look` tool: ask the pinned oracle model one question about a
media file the session's own model can't view. Sends the file's bytes and
the prompt in a single generate call and returns the answer as text. The
description carries the oracle's identity and capability set, interpolated
once at factory time (prompt-cache stable).

## Parameters

### opts

[`LookToolOptions`](../interfaces/LookToolOptions.md)

## Returns

`ToolDefinition`\<\{ `path`: `string`; `prompt`: `string`; \}, \{ `answer`: `string`; `media_type`: `string`; `model`: `string`; `path`: `string`; \}\>
