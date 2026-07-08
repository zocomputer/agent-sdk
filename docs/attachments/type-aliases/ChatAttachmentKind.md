[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [attachments](../README.md) / ChatAttachmentKind

# Type Alias: ChatAttachmentKind

> **ChatAttachmentKind** = `"image"` \| `"video"` \| `"audio"`

Defined in: [packages/agent-sdk/src/attachments.ts:37](https://github.com/zocomputer/zov2-code/blob/0bb195a93a5e8bd5814dac23311408353312bc4f/packages/agent-sdk/src/attachments.ts#L37)

Media kinds the attachment contract carries. Image delivery works with
every vision model; video/audio are provider-gated (the read/webfetch
factories only attach them when the consumer opts in).
