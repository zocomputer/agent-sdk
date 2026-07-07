[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / resolveWebFetchTimeoutMs

# Function: resolveWebFetchTimeoutMs()

> **resolveWebFetchTimeoutMs**(`timeoutSeconds`, `url?`): `number`

Defined in: [packages/agent-sdk/src/web-fetch.ts:337](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/web-fetch.ts#L337)

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
