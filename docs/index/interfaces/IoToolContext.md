[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / IoToolContext

# Interface: IoToolContext

Defined in: [packages/agent-sdk/src/workspace-io.ts:127](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/workspace-io.ts#L127)

The slice of eve's `ToolContext` an IO provider may use. Structural, so
tools can hand their eve context straight through without the lib importing
`eve/*`. The session id is exposed for `resolveSession` hooks that run
per-session setup (the Builder's workspace bootstrap keys on it).

## Properties

### session?

> `readonly` `optional` **session?**: `object`

Defined in: [packages/agent-sdk/src/workspace-io.ts:128](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/workspace-io.ts#L128)

#### id

> `readonly` **id**: `string`

## Methods

### getSandbox()

> **getSandbox**(): `PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:130](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/workspace-io.ts#L130)

Resolve the sandbox session for the current tool call.

#### Returns

`PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>
