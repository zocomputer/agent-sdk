[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / clientContinuationToken

# Function: clientContinuationToken()

> **clientContinuationToken**(`runtimeToken`): `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:29](https://github.com/zocomputer/zov2-code/blob/b7f06ca2cf0142cf87a67d683e96ae88d6c29abe/packages/agent-sdk/src/park-delivery.ts#L29)

Recover the client-facing continuation token from a hook's runtime one.
eve namespaces the runtime token as `<namespace>:<client token>` (its
`namespaceContinuationToken` treats everything before the FIRST colon as the
namespace; the default HTTP channel's client token is itself `eve:<uuid>`,
so the runtime form is `eve:eve:<uuid>`). The continue route wants the
client token — sending the namespaced form silently creates a NEW session.

## Parameters

### runtimeToken

`string`

## Returns

`string`
