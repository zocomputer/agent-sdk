[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxHandleRequest

# Interface: StateSandboxHandleRequest

Defined in: [packages/agent-sdk/src/state-sandbox.ts:78](https://github.com/zocomputer/zov2-code/blob/af9677372192b613a9430e022ed9c3a186791633/packages/agent-sdk/src/state-sandbox.ts#L78)

The request body sent to the runtime broker when requesting a state sandbox handle.
Names the state declaration and specifies required interface, access, and suggested defaults.

## Properties

### access

> `readonly` **access**: [`StateSandboxAccess`](../type-aliases/StateSandboxAccess.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:81](https://github.com/zocomputer/zov2-code/blob/af9677372192b613a9430e022ed9c3a186791633/packages/agent-sdk/src/state-sandbox.ts#L81)

***

### declarationName

> `readonly` **declarationName**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:79](https://github.com/zocomputer/zov2-code/blob/af9677372192b613a9430e022ed9c3a186791633/packages/agent-sdk/src/state-sandbox.ts#L79)

***

### interface

> `readonly` **interface**: [`StateSandboxInterface`](../type-aliases/StateSandboxInterface.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:80](https://github.com/zocomputer/zov2-code/blob/af9677372192b613a9430e022ed9c3a186791633/packages/agent-sdk/src/state-sandbox.ts#L80)

***

### suggestedDefaults

> `readonly` **suggestedDefaults**: [`StateSandboxSuggestedDefaults`](StateSandboxSuggestedDefaults.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:82](https://github.com/zocomputer/zov2-code/blob/af9677372192b613a9430e022ed9c3a186791633/packages/agent-sdk/src/state-sandbox.ts#L82)
