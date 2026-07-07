[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [attachments](../README.md) / readChatAttachment

# Function: readChatAttachment()

> **readChatAttachment**(`toolOutput`): [`ChatAttachment`](../type-aliases/ChatAttachment.md) \| `null`

Defined in: [packages/agent-sdk/src/attachments.ts:76](https://github.com/zocomputer/zov2-code/blob/e58b3bae5fbd35c5f457130033750c9c33ee334c/packages/agent-sdk/src/attachments.ts#L76)

Read the model-hidden media attachment off a tool result, if present.
Matches by payload shape, not tool name, so it's agnostic to what a
consumer named its read tool. Returns null for any result without a valid
attachment.

## Parameters

### toolOutput

`unknown`

## Returns

[`ChatAttachment`](../type-aliases/ChatAttachment.md) \| `null`
