[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxRunOptions

# Interface: StateSandboxRunOptions

Defined in: [packages/agent-sdk/src/state-sandbox.ts:236](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/state-sandbox.ts#L236)

Options for running a command in a state sandbox.
Specifies working directory, environment variables, and an optional abort signal.

## Properties

### abortSignal?

> `readonly` `optional` **abortSignal?**: `AbortSignal`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:240](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/state-sandbox.ts#L240)

***

### env?

> `readonly` `optional` **env?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:239](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/state-sandbox.ts#L239)

Extra env for this command. Ambient process env is never read implicitly.

***

### workingDirectory?

> `readonly` `optional` **workingDirectory?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:237](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/state-sandbox.ts#L237)
