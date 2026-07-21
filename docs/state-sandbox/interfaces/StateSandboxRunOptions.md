[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxRunOptions

# Interface: StateSandboxRunOptions

Defined in: [packages/agent-sdk/src/state-sandbox.ts:281](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/state-sandbox.ts#L281)

Options for running a command in a state sandbox.
Specifies working directory, environment variables, and an optional abort signal.

## Properties

### abortSignal?

> `readonly` `optional` **abortSignal?**: `AbortSignal`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:285](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/state-sandbox.ts#L285)

***

### env?

> `readonly` `optional` **env?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:284](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/state-sandbox.ts#L284)

Extra env for this command. Ambient process env is never read implicitly.

***

### workingDirectory?

> `readonly` `optional` **workingDirectory?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:282](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/state-sandbox.ts#L282)
