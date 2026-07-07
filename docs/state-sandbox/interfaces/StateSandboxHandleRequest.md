[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxHandleRequest

# Interface: StateSandboxHandleRequest

Defined in: [packages/agent-sdk/src/state-sandbox.ts:69](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L69)

The request body sent to the runtime broker when requesting a state sandbox handle.
Names the state declaration and specifies required interface, access, and suggested defaults.

## Properties

### access

> `readonly` **access**: [`StateSandboxAccess`](../type-aliases/StateSandboxAccess.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:72](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L72)

***

### declarationName

> `readonly` **declarationName**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:70](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L70)

***

### interface

> `readonly` **interface**: [`StateSandboxInterface`](../type-aliases/StateSandboxInterface.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:71](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L71)

***

### suggestedDefaults

> `readonly` **suggestedDefaults**: [`StateSandboxSuggestedDefaults`](StateSandboxSuggestedDefaults.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:73](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L73)
