[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [initiator-auth](../README.md) / readInitiator

# Function: readInitiator()

> **readInitiator**(`initiator`): [`InitiatorIdentity`](../interfaces/InitiatorIdentity.md) \| `null`

Defined in: [packages/agent-sdk/src/initiator-auth.ts:72](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/initiator-auth.ts#L72)

Pull `{ userId, agentId }` off a session's `initiator` SessionAuthContext, or
`null` when it's absent (local dev, unscoped session) or malformed —
`agentId` from `attributes.agentId`, `userId` from `subject` (matching
`initiatorAuth` above).

## Parameters

### initiator

[`InitiatorReadable`](../interfaces/InitiatorReadable.md) \| `null` \| `undefined`

## Returns

[`InitiatorIdentity`](../interfaces/InitiatorIdentity.md) \| `null`
