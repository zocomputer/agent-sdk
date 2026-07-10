[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createLookTool

# Function: createLookTool()

> **createLookTool**(`opts`): `ToolDefinition`\<\{ `path`: `string`; `prompt`: `string`; \}, \{ `answer`: `string`; `media_type`: `string`; `model`: `string`; `path`: `string`; \}\>

Defined in: [packages/agent-sdk/src/tools/look.ts:190](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/tools/look.ts#L190)

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
