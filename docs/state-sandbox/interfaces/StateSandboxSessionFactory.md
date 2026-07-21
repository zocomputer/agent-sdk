[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxSessionFactory

# Interface: StateSandboxSessionFactory()

Defined in: [packages/agent-sdk/src/state-sandbox.ts:352](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/state-sandbox.ts#L352)

Factory function that creates a sandbox session from a handle.
Typically implemented by an SSH client that connects to the sandbox's access credentials.

> **StateSandboxSessionFactory**(`handle`): `PromiseLike`\<[`StateSandboxSessionLike`](StateSandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:353](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/state-sandbox.ts#L353)

Factory function that creates a sandbox session from a handle.
Typically implemented by an SSH client that connects to the sandbox's access credentials.

## Parameters

### handle

[`StateSandboxHandle`](StateSandboxHandle.md)

## Returns

`PromiseLike`\<[`StateSandboxSessionLike`](StateSandboxSessionLike.md)\>
