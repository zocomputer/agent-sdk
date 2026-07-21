[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxSessionFactory

# Interface: StateSandboxSessionFactory()

Defined in: [packages/agent-sdk/src/state-sandbox.ts:352](https://github.com/zocomputer/zov2-code/blob/3530b39a94e929be74c3d9202bace84f47b21b44/packages/agent-sdk/src/state-sandbox.ts#L352)

Factory function that creates a sandbox session from a handle.
Typically implemented by an SSH client that connects to the sandbox's access credentials.

> **StateSandboxSessionFactory**(`handle`): `PromiseLike`\<[`StateSandboxSessionLike`](StateSandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:353](https://github.com/zocomputer/zov2-code/blob/3530b39a94e929be74c3d9202bace84f47b21b44/packages/agent-sdk/src/state-sandbox.ts#L353)

Factory function that creates a sandbox session from a handle.
Typically implemented by an SSH client that connects to the sandbox's access credentials.

## Parameters

### handle

[`StateSandboxHandle`](StateSandboxHandle.md)

## Returns

`PromiseLike`\<[`StateSandboxSessionLike`](StateSandboxSessionLike.md)\>
