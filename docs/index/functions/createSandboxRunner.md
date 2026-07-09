[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSandboxRunner

# Function: createSandboxRunner()

> **createSandboxRunner**(`opts`): [`CommandRunner`](../interfaces/CommandRunner.md)

Defined in: [packages/agent-sdk/src/sandbox-run.ts:155](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/sandbox-run.ts#L155)

One call's command runner over a sandbox session. The session resolves
lazily on first command and is shared across the call's commands.

## Parameters

### opts

#### root

`string`

Absolute workspace root inside the sandbox.

#### session

() => `PromiseLike`\<[`SandboxSessionLike`](../interfaces/SandboxSessionLike.md)\>

Resolves the session; called once, lazily, on the first command.

#### spillDir?

`string`

Absolute spill directory inside the sandbox; omit to disable spilling.

## Returns

[`CommandRunner`](../interfaces/CommandRunner.md)
