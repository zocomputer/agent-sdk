[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / Workspace

# Interface: Workspace

Defined in: [packages/agent-sdk/src/workspace.ts:30](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/workspace.ts#L30)

One workspace root plus the two path operations every file tool needs.

## Properties

### root

> `readonly` **root**: `string`

Defined in: [packages/agent-sdk/src/workspace.ts:31](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/workspace.ts#L31)

## Methods

### relativize()

> **relativize**(`abs`): `string`

Defined in: [packages/agent-sdk/src/workspace.ts:35](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/workspace.ts#L35)

Turn an absolute path into a root-relative, forward-slash display path.

#### Parameters

##### abs

`string`

#### Returns

`string`

***

### resolve()

> **resolve**(`path`): `string`

Defined in: [packages/agent-sdk/src/workspace.ts:33](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/workspace.ts#L33)

Resolve a path against the workspace root and refuse anything that escapes it.

#### Parameters

##### path

`string`

#### Returns

`string`
