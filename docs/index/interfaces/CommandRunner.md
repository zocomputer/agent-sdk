[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / CommandRunner

# Interface: CommandRunner

Defined in: [packages/agent-sdk/src/run.ts:66](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/run.ts#L66)

A workspace-rooted shell runner that spawns commands in detached process
groups and captures/spills their output.

## Methods

### runCommand()

> **runCommand**(`command`, `opts?`): `Promise`\<[`RunResult`](RunResult.md)\>

Defined in: [packages/agent-sdk/src/run.ts:70](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/run.ts#L70)

startCommand, awaited to completion.

#### Parameters

##### command

`string`

##### opts?

[`StartCommandOptions`](StartCommandOptions.md)

#### Returns

`Promise`\<[`RunResult`](RunResult.md)\>

***

### startCommand()

> **startCommand**(`command`, `opts?`): [`RunningCommand`](RunningCommand.md)

Defined in: [packages/agent-sdk/src/run.ts:68](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/run.ts#L68)

Spawn a shell command and return live handles (progress preview, kill, result).

#### Parameters

##### command

`string`

##### opts?

[`StartCommandOptions`](StartCommandOptions.md)

#### Returns

[`RunningCommand`](RunningCommand.md)
