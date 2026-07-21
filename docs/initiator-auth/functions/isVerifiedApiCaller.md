[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [initiator-auth](../README.md) / isVerifiedApiCaller

# Function: isVerifiedApiCaller()

> **isVerifiedApiCaller**(`token`, `subjects`): `boolean`

Defined in: [packages/agent-sdk/src/initiator-auth.ts:162](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/initiator-auth.ts#L162)

Whether an already-verified `token`'s `sub` matches one of the configured API
`subjects` — i.e. the caller is Zo's API, not the agent's own current-project
bypass token. The channel owner calls this AFTER `verifyVercelOidc` succeeds,
and only trusts `x-zo-initiator` when it returns `true`.

## Parameters

### token

`string`

### subjects

readonly `string`[]

## Returns

`boolean`
