[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createReadWorkspace

# Function: createReadWorkspace()

> **createReadWorkspace**(`root`, `additionalRoots`): [`Workspace`](../interfaces/Workspace.md)

Defined in: [packages/agent-sdk/src/workspace.ts:57](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/workspace.ts#L57)

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
