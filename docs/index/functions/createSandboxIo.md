[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSandboxIo

# Function: createSandboxIo()

> **createSandboxIo**(`opts`): [`WorkspaceIO`](../interfaces/WorkspaceIO.md)

Defined in: [packages/agent-sdk/src/sandbox-io.ts:85](https://github.com/zocomputer/zov2-code/blob/b4029c52fbf982f223af7621dd5db23545388982/packages/agent-sdk/src/sandbox-io.ts#L85)

One call's IO over a sandbox session. The session resolves lazily on first
use and is shared across the call's operations.

## Parameters

### opts

#### root

`string`

#### session

() => `PromiseLike`\<[`SandboxSessionLike`](../interfaces/SandboxSessionLike.md)\>

## Returns

[`WorkspaceIO`](../interfaces/WorkspaceIO.md)
