[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [channel-auth](../README.md) / zoChannelAuth

# Function: zoChannelAuth()

> **zoChannelAuth**(`subjects?`): readonly `AuthFn`[]

Defined in: [packages/agent-sdk/src/channel-auth.ts:85](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/channel-auth.ts#L85)

The complete channel auth walk for a Zo-hosted agent, selected by whether the
caller-identity subjects are configured.

With subjects present, the caller must verify as Zo's API
([verifiedInitiatorAuth](verifiedInitiatorAuth.md)) and `localDev()` covers loopback `eve dev`;
there is no anonymous entry, so a deployed request without a verified caller
exhausts the walk with 401.

With no subjects — an agent deployed before Zo's API injects them — it falls
back to the pre-OIDC behavior so the agent keeps working through the migration.

## Parameters

### subjects?

`string`

Raw comma-separated subject list. Defaults to the
`ZO_API_OIDC_SUBJECTS` environment variable, which Zo's API injects at deploy time.

## Returns

readonly `AuthFn`[]

The `AuthFn` array to pass as a channel's `auth`.
