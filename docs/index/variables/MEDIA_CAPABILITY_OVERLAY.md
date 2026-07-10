[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MEDIA\_CAPABILITY\_OVERLAY

# Variable: MEDIA\_CAPABILITY\_OVERLAY

> `const` **MEDIA\_CAPABILITY\_OVERLAY**: `Record`\<`string`, `Partial`\<[`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)\>\>

Defined in: [packages/agent-sdk/src/model-capabilities.ts:45](https://github.com/zocomputer/zov2-code/blob/b1083703742c40f0a33149c0d589f9948d72aea2/packages/agent-sdk/src/model-capabilities.ts#L45)

Per-family capability additions the gateway catalog under-reports, keyed by
the model id's creator segment (the part before the `/`). Applied as a
union on top of the catalog tags — an overlay can only add capabilities,
never remove what the catalog attests.
