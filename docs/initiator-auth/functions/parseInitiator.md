[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [initiator-auth](../README.md) / parseInitiator

# Function: parseInitiator()

> **parseInitiator**(`value`): [`InitiatorIdentity`](../interfaces/InitiatorIdentity.md) \| `null`

Defined in: [packages/agent-sdk/src/initiator-auth.ts:32](https://github.com/zocomputer/zov2-code/blob/a2d5ceb2d9204a0eb63ca9530ef74679c3b52143/packages/agent-sdk/src/initiator-auth.ts#L32)

Parse-then-narrow the `INITIATOR_HEADER` value; `null` on absent/malformed.

## Parameters

### value

`string` \| `null` \| `undefined`

## Returns

[`InitiatorIdentity`](../interfaces/InitiatorIdentity.md) \| `null`
