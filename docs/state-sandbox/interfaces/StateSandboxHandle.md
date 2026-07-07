[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxHandle

# Interface: StateSandboxHandle

Defined in: [packages/agent-sdk/src/state-sandbox.ts:41](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L41)

Broker response for a sandbox state instance.

IDs, `partition`, `rootPath`, and `lifecycle` are safe for diagnostics. Treat `ssh` as a
bearer secret; it grants temporary access to the VM.

## Properties

### access

> `readonly` **access**: [`StateSandboxAccess`](../type-aliases/StateSandboxAccess.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:45](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L45)

***

### declarationName

> `readonly` **declarationName**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:43](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L43)

***

### engine

> `readonly` **engine**: `"sandbox-daytona"`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:46](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L46)

***

### handleId

> `readonly` **handleId**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:42](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L42)

***

### interface

> `readonly` **interface**: [`StateSandboxInterface`](../type-aliases/StateSandboxInterface.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:44](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L44)

***

### lifecycle

> `readonly` **lifecycle**: [`StateSandboxLifecycle`](../type-aliases/StateSandboxLifecycle.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:52](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L52)

***

### partition

> `readonly` **partition**: [`StateSandboxPartition`](../type-aliases/StateSandboxPartition.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:49](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L49)

***

### rootPath

> `readonly` **rootPath**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:51](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L51)

***

### sandbox

> `readonly` **sandbox**: [`StateSandboxSshAccess`](StateSandboxSshAccess.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:53](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L53)

***

### sandboxResourceId

> `readonly` **sandboxResourceId**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:50](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L50)

***

### stateInstanceId

> `readonly` **stateInstanceId**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:48](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L48)

***

### storeId

> `readonly` **storeId**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:47](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L47)
