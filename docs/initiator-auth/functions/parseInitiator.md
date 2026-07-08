[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [initiator-auth](../README.md) / parseInitiator

# Function: parseInitiator()

> **parseInitiator**(`value`): [`InitiatorIdentity`](../interfaces/InitiatorIdentity.md) \| `null`

Defined in: [packages/agent-sdk/src/initiator-auth.ts:32](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/initiator-auth.ts#L32)

Parse-then-narrow the `INITIATOR_HEADER` value; `null` on absent/malformed.

## Parameters

### value

`string` \| `null` \| `undefined`

## Returns

[`InitiatorIdentity`](../interfaces/InitiatorIdentity.md) \| `null`
