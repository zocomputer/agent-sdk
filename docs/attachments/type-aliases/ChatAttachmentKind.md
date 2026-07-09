[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [attachments](../README.md) / ChatAttachmentKind

# Type Alias: ChatAttachmentKind

> **ChatAttachmentKind** = `"image"` \| `"video"` \| `"audio"`

Defined in: [packages/agent-sdk/src/attachments.ts:37](https://github.com/zocomputer/zov2-code/blob/d22a2863f30f9fa1a7f8dbb051f97b4846076bf1/packages/agent-sdk/src/attachments.ts#L37)

Media kinds the attachment contract carries. Image delivery works with
every vision model; video/audio are provider-gated (the read/webfetch
factories only attach them when the consumer opts in).
