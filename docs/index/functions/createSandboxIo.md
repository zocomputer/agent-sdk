[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSandboxIo

# Function: createSandboxIo()

> **createSandboxIo**(`opts`): [`WorkspaceIO`](../interfaces/WorkspaceIO.md)

Defined in: [packages/agent-sdk/src/sandbox-io.ts:95](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/sandbox-io.ts#L95)

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
