[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state](../README.md) / ExternalStateDeclaration

# Interface: ExternalStateDeclaration

Defined in: [packages/agent-sdk/src/state.ts:40](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/state.ts#L40)

What an agent declares it depends on: the interface, access, visibility intent, and deployment hints for one external-state capability.

## Properties

### access

> `readonly` **access**: [`StateAccess`](../type-aliases/StateAccess.md)

Defined in: [packages/agent-sdk/src/state.ts:48](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/state.ts#L48)

***

### intent

> `readonly` **intent**: [`StateIntent`](../type-aliases/StateIntent.md)

Defined in: [packages/agent-sdk/src/state.ts:49](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/state.ts#L49)

***

### interface

> `readonly` **interface**: [`StateInterface`](../type-aliases/StateInterface.md)

Defined in: [packages/agent-sdk/src/state.ts:47](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/state.ts#L47)

***

### name

> `readonly` **name**: `string`

Defined in: [packages/agent-sdk/src/state.ts:46](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/state.ts#L46)

What tools reference at runtime. Must equal the declaring filename
(`agent/state/<name>.ts`) — deploy validation enforces the match, which
also makes duplicate names structurally impossible.

***

### suggestedDefaults?

> `readonly` `optional` **suggestedDefaults?**: [`SuggestedStateDefaults`](SuggestedStateDefaults.md)

Defined in: [packages/agent-sdk/src/state.ts:50](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/state.ts#L50)
