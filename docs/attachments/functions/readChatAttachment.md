[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [attachments](../README.md) / readChatAttachment

# Function: readChatAttachment()

> **readChatAttachment**(`toolOutput`): [`ChatAttachment`](../type-aliases/ChatAttachment.md) \| `null`

Defined in: [packages/agent-sdk/src/attachments.ts:76](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/attachments.ts#L76)

Read the model-hidden media attachment off a tool result, if present.
Matches by payload shape, not tool name, so it's agnostic to what a
consumer named its read tool. Returns null for any result without a valid
attachment.

## Parameters

### toolOutput

`unknown`

## Returns

[`ChatAttachment`](../type-aliases/ChatAttachment.md) \| `null`
