[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [channel-auth](../README.md) / verifiedInitiatorAuth

# Function: verifiedInitiatorAuth()

> **verifiedInitiatorAuth**(`subjects`): `AuthFn`

Defined in: [packages/agent-sdk/src/channel-auth.ts:42](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/channel-auth.ts#L42)

Build an `AuthFn` that verifies the caller is Zo's API over Vercel OIDC
before trusting the `x-zo-initiator` header it injects.

eve's `verifyVercelOidc` also accepts the agent's OWN project token (the
always-on current-project bypass) for internal and subagent calls. Those
authenticate as a service principal but must NOT be able to assert a user
initiator — otherwise a tenant could forge any initiator with their own
project's OIDC token. So the injected header is honored only when the token's
`sub` additionally matches a configured API subject.

Returns `null` when the caller is unverified, so the channel's auth walk falls
through to the next entry (and ultimately 401) rather than accepting anonymously.

## Parameters

### subjects

readonly `string`[]

Vercel OIDC `sub` patterns identifying Zo's API project,
as parsed by [parseApiSubjects](../../initiator-auth/functions/parseApiSubjects.md). Supports `*` wildcards.

## Returns

`AuthFn`

An `AuthFn` for a channel's `auth` array.
