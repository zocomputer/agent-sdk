[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / StatIdentity

# Interface: StatIdentity

Defined in: [packages/agent-sdk/src/extract/cache.ts:11](https://github.com/zocomputer/zov2-code/blob/492659e3281a9b9d11501446d7ec2e941b7da162/packages/agent-sdk/src/extract/cache.ts#L11)

A file's stat-based identity: mtime plus size. The cache validates hits
against both, so a changed file re-extracts.

## Properties

### mtimeMs

> `readonly` **mtimeMs**: `number`

Defined in: [packages/agent-sdk/src/extract/cache.ts:12](https://github.com/zocomputer/zov2-code/blob/492659e3281a9b9d11501446d7ec2e941b7da162/packages/agent-sdk/src/extract/cache.ts#L12)

***

### size

> `readonly` **size**: `number`

Defined in: [packages/agent-sdk/src/extract/cache.ts:13](https://github.com/zocomputer/zov2-code/blob/492659e3281a9b9d11501446d7ec2e941b7da162/packages/agent-sdk/src/extract/cache.ts#L13)
