[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / CommandRunner

# Interface: CommandRunner

Defined in: [packages/agent-sdk/src/run.ts:67](https://github.com/zocomputer/zov2-code/blob/d124383bcfcf0ca6d96b92bff96fa6dfccc07562/packages/agent-sdk/src/run.ts#L67)

A workspace-rooted shell runner that spawns commands in detached process
groups and captures/spills their output.

## Methods

### runCommand()

> **runCommand**(`command`, `opts?`): `Promise`\<[`RunResult`](RunResult.md)\>

Defined in: [packages/agent-sdk/src/run.ts:71](https://github.com/zocomputer/zov2-code/blob/d124383bcfcf0ca6d96b92bff96fa6dfccc07562/packages/agent-sdk/src/run.ts#L71)

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

Defined in: [packages/agent-sdk/src/run.ts:69](https://github.com/zocomputer/zov2-code/blob/d124383bcfcf0ca6d96b92bff96fa6dfccc07562/packages/agent-sdk/src/run.ts#L69)

Spawn a shell command and return live handles (progress preview, kill, result).

#### Parameters

##### command

`string`

##### opts?

[`StartCommandOptions`](StartCommandOptions.md)

#### Returns

[`RunningCommand`](RunningCommand.md)
