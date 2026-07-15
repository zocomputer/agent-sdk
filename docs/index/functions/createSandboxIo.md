[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSandboxIo

# Function: createSandboxIo()

> **createSandboxIo**(`opts`): [`WorkspaceIO`](../interfaces/WorkspaceIO.md)

Defined in: [packages/agent-sdk/src/sandbox-io.ts:95](https://github.com/zocomputer/zov2-code/blob/344fef7287e3cdac215bfeba4bb54fc2101e5e6e/packages/agent-sdk/src/sandbox-io.ts#L95)

One call's IO over a sandbox session. The session resolves lazily on first
use and is shared across the call's operations.

## Parameters

### opts

#### abortSignal?

`AbortSignal`

#### root

`string`

#### session

() => `PromiseLike`\<[`SandboxSessionLike`](../interfaces/SandboxSessionLike.md)\>

## Returns

[`WorkspaceIO`](../interfaces/WorkspaceIO.md)
