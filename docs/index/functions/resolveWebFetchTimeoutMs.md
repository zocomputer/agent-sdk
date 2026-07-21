[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / resolveWebFetchTimeoutMs

# Function: resolveWebFetchTimeoutMs()

> **resolveWebFetchTimeoutMs**(`timeoutSeconds`, `url?`): `number`

Defined in: [packages/agent-sdk/src/web-fetch.ts:353](https://github.com/zocomputer/zov2-code/blob/af9677372192b613a9430e022ed9c3a186791633/packages/agent-sdk/src/web-fetch.ts#L353)

Clamp the model-supplied timeout (seconds) into the allowed range, in ms.
An explicit timeout always wins; without one, `.pdf` URLs default higher
than pages (models rarely think to raise the timeout for a slow PDF).

## Parameters

### timeoutSeconds

`number` \| `undefined`

### url?

`string`

## Returns

`number`
