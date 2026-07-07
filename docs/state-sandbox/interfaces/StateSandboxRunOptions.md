[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxRunOptions

# Interface: StateSandboxRunOptions

Defined in: [packages/agent-sdk/src/state-sandbox.ts:236](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/state-sandbox.ts#L236)

Options for running a command in a state sandbox.
Specifies working directory, environment variables, and an optional abort signal.

## Properties

### abortSignal?

> `readonly` `optional` **abortSignal?**: `AbortSignal`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:240](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/state-sandbox.ts#L240)

***

### env?

> `readonly` `optional` **env?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:239](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/state-sandbox.ts#L239)

Extra env for this command. Ambient process env is never read implicitly.

***

### workingDirectory?

> `readonly` `optional` **workingDirectory?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:237](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/state-sandbox.ts#L237)
