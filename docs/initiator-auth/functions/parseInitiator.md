[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [initiator-auth](../README.md) / parseInitiator

# Function: parseInitiator()

> **parseInitiator**(`value`): [`InitiatorIdentity`](../interfaces/InitiatorIdentity.md) \| `null`

Defined in: [packages/agent-sdk/src/initiator-auth.ts:36](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/initiator-auth.ts#L36)

Parse-then-narrow the `INITIATOR_HEADER` value; `null` on absent/malformed.

## Parameters

### value

`string` \| `null` \| `undefined`

## Returns

[`InitiatorIdentity`](../interfaces/InitiatorIdentity.md) \| `null`
