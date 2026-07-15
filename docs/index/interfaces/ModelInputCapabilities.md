[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ModelInputCapabilities

# Interface: ModelInputCapabilities

Defined in: [packages/agent-sdk/src/model-capabilities.ts:20](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/model-capabilities.ts#L20)

The media kinds a model accepts as input. Input modalities only —
deliberately scoped (context windows, reasoning, tool support stay out).

## Properties

### audio

> `readonly` **audio**: `boolean`

Defined in: [packages/agent-sdk/src/model-capabilities.ts:28](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/model-capabilities.ts#L28)

Accepts `audio/*` file parts (overlay-sourced; the catalog can't say).

***

### image

> `readonly` **image**: `boolean`

Defined in: [packages/agent-sdk/src/model-capabilities.ts:22](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/model-capabilities.ts#L22)

Accepts `image/*` file parts (the catalog's `vision` tag).

***

### pdf

> `readonly` **pdf**: `boolean`

Defined in: [packages/agent-sdk/src/model-capabilities.ts:24](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/model-capabilities.ts#L24)

Accepts `application/pdf` file parts (the catalog's `file-input` tag).

***

### video

> `readonly` **video**: `boolean`

Defined in: [packages/agent-sdk/src/model-capabilities.ts:26](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/model-capabilities.ts#L26)

Accepts `video/*` file parts (overlay-sourced; the catalog can't say).
