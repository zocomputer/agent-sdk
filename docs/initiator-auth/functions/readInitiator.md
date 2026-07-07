[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [initiator-auth](../README.md) / readInitiator

# Function: readInitiator()

> **readInitiator**(`initiator`): [`InitiatorIdentity`](../interfaces/InitiatorIdentity.md) \| `null`

Defined in: [packages/agent-sdk/src/initiator-auth.ts:72](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/initiator-auth.ts#L72)

Pull `{ userId, agentId }` off a session's `initiator` SessionAuthContext, or
`null` when it's absent (local dev, unscoped session) or malformed —
`agentId` from `attributes.agentId`, `userId` from `subject` (matching
`initiatorAuth` above).

## Parameters

### initiator

[`InitiatorReadable`](../interfaces/InitiatorReadable.md) \| `null` \| `undefined`

## Returns

[`InitiatorIdentity`](../interfaces/InitiatorIdentity.md) \| `null`
