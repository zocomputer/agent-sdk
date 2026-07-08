[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / Workspace

# Interface: Workspace

Defined in: [packages/agent-sdk/src/workspace.ts:28](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/workspace.ts#L28)

One workspace root plus the two path operations every file tool needs.

## Properties

### root

> `readonly` **root**: `string`

Defined in: [packages/agent-sdk/src/workspace.ts:29](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/workspace.ts#L29)

## Methods

### relativize()

> **relativize**(`abs`): `string`

Defined in: [packages/agent-sdk/src/workspace.ts:33](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/workspace.ts#L33)

Turn an absolute path into a root-relative, forward-slash display path.

#### Parameters

##### abs

`string`

#### Returns

`string`

***

### resolve()

> **resolve**(`path`): `string`

Defined in: [packages/agent-sdk/src/workspace.ts:31](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/workspace.ts#L31)

Resolve a path against the workspace root and refuse anything that escapes it.

#### Parameters

##### path

`string`

#### Returns

`string`
