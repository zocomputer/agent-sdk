[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [attachments](../README.md) / DEFAULT\_MAX\_INLINE\_IMAGE\_BYTES

# Variable: DEFAULT\_MAX\_INLINE\_IMAGE\_BYTES

> `const` **DEFAULT\_MAX\_INLINE\_IMAGE\_BYTES**: `number`

Defined in: [packages/agent-sdk/src/attachments.ts:25](https://github.com/zocomputer/zov2-code/blob/a259f6f3d345009ac90c86d9f10d9171b99736b9/packages/agent-sdk/src/attachments.ts#L25)

Default cap for inlining image bytes on a `read`/`webfetch` result: 3 MiB,
matching eve's attachment-staging hydration cap (`shouldInlineSandboxRefAsBytes`,
eve ≤0.19: images ≤3 MiB inline at model-call time; bigger ones hydrate as a
text stub). Staying under it keeps read's "queued" promise truthful on every
runtime — a bigger image gets the honest metadata-only note instead of
silently degrading after delivery.
