[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createReadWorkspace

# Function: createReadWorkspace()

> **createReadWorkspace**(`root`, `additionalRoots`): [`Workspace`](../interfaces/Workspace.md)

Defined in: [packages/agent-sdk/src/workspace.ts:57](https://github.com/zocomputer/zov2-code/blob/c064bb48e9a6d214ad3688019aaf958920a35455/packages/agent-sdk/src/workspace.ts#L57)

Build a read-only path resolver with one workspace root plus explicit
absolute roots. Relative paths still resolve from the workspace. Consumers
must use this only for read surfaces; edit/write keep `createWorkspace`.

## Parameters

### root

`string`

### additionalRoots

readonly `string`[]

## Returns

[`Workspace`](../interfaces/Workspace.md)
