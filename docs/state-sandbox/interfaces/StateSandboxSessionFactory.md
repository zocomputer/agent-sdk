[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxSessionFactory

# Interface: StateSandboxSessionFactory()

Defined in: [packages/agent-sdk/src/state-sandbox.ts:316](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/state-sandbox.ts#L316)

Factory function that creates a sandbox session from a handle.
Typically implemented by an SSH client that connects to the sandbox's access credentials.

> **StateSandboxSessionFactory**(`handle`): `PromiseLike`\<[`StateSandboxSessionLike`](StateSandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:317](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/state-sandbox.ts#L317)

Factory function that creates a sandbox session from a handle.
Typically implemented by an SSH client that connects to the sandbox's access credentials.

## Parameters

### handle

[`StateSandboxHandle`](StateSandboxHandle.md)

## Returns

`PromiseLike`\<[`StateSandboxSessionLike`](StateSandboxSessionLike.md)\>
