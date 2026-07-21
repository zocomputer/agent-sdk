[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / IoToolContext

# Interface: IoToolContext

Defined in: [packages/agent-sdk/src/workspace-io.ts:127](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/workspace-io.ts#L127)

The slice of eve's `ToolContext` an IO provider may use. Structural, so
tools can hand their eve context straight through without the lib importing
`eve/*`. The session id is exposed for `resolveSession` hooks that run
per-session setup (the Builder's workspace bootstrap keys on it).

## Properties

### abortSignal

> `readonly` **abortSignal**: `AbortSignal`

Defined in: [packages/agent-sdk/src/workspace-io.ts:132](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/workspace-io.ts#L132)

Aborts when the owning turn is cancelled.

***

### callId

> `readonly` **callId**: `string`

Defined in: [packages/agent-sdk/src/workspace-io.ts:130](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/workspace-io.ts#L130)

Eve's stable id for this tool execution.

***

### session?

> `readonly` `optional` **session?**: `object`

Defined in: [packages/agent-sdk/src/workspace-io.ts:128](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/workspace-io.ts#L128)

#### id

> `readonly` **id**: `string`

## Methods

### getSandbox()

> **getSandbox**(): `PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:134](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/workspace-io.ts#L134)

Resolve the sandbox session for the current tool call.

#### Returns

`PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>
