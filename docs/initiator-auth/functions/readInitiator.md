[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [initiator-auth](../README.md) / readInitiator

# Function: readInitiator()

> **readInitiator**(`initiator`): [`InitiatorIdentity`](../interfaces/InitiatorIdentity.md) \| `null`

Defined in: [packages/agent-sdk/src/initiator-auth.ts:83](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/initiator-auth.ts#L83)

Pull `{ userId, agentId }` off a session's `initiator` SessionAuthContext, or
`null` when it's absent (local dev, unscoped session) or malformed —
`agentId` from `attributes.agentId`, `userId` from `subject` (matching
`initiatorAuth` above).

## Parameters

### initiator

[`InitiatorReadable`](../interfaces/InitiatorReadable.md) \| `null` \| `undefined`

## Returns

[`InitiatorIdentity`](../interfaces/InitiatorIdentity.md) \| `null`
