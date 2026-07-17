[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxRunOptions

# Interface: StateSandboxRunOptions

Defined in: [packages/agent-sdk/src/state-sandbox.ts:255](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L255)

Options for running a command in a state sandbox.
Specifies working directory, environment variables, and an optional abort signal.

## Properties

### abortSignal?

> `readonly` `optional` **abortSignal?**: `AbortSignal`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:259](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L259)

***

### env?

> `readonly` `optional` **env?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:258](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L258)

Extra env for this command. Ambient process env is never read implicitly.

***

### workingDirectory?

> `readonly` `optional` **workingDirectory?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:256](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L256)
