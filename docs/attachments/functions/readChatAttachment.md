[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [attachments](../README.md) / readChatAttachment

# Function: readChatAttachment()

> **readChatAttachment**(`toolOutput`): [`ChatAttachment`](../type-aliases/ChatAttachment.md) \| `null`

Defined in: [packages/agent-sdk/src/attachments.ts:76](https://github.com/zocomputer/zov2-code/blob/0bb195a93a5e8bd5814dac23311408353312bc4f/packages/agent-sdk/src/attachments.ts#L76)

Read the model-hidden media attachment off a tool result, if present.
Matches by payload shape, not tool name, so it's agnostic to what a
consumer named its read tool. Returns null for any result without a valid
attachment.

## Parameters

### toolOutput

`unknown`

## Returns

[`ChatAttachment`](../type-aliases/ChatAttachment.md) \| `null`
