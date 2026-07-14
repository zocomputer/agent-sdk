[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / StatIdentity

# Interface: StatIdentity

Defined in: [packages/agent-sdk/src/extract/cache.ts:11](https://github.com/zocomputer/zov2-code/blob/2f6c8cc3fd1672c6cd6d12c28dbf229ac82949b0/packages/agent-sdk/src/extract/cache.ts#L11)

A file's stat-based identity: mtime plus size. The cache validates hits
against both, so a changed file re-extracts.

## Properties

### mtimeMs

> `readonly` **mtimeMs**: `number`

Defined in: [packages/agent-sdk/src/extract/cache.ts:12](https://github.com/zocomputer/zov2-code/blob/2f6c8cc3fd1672c6cd6d12c28dbf229ac82949b0/packages/agent-sdk/src/extract/cache.ts#L12)

***

### size

> `readonly` **size**: `number`

Defined in: [packages/agent-sdk/src/extract/cache.ts:13](https://github.com/zocomputer/zov2-code/blob/2f6c8cc3fd1672c6cd6d12c28dbf229ac82949b0/packages/agent-sdk/src/extract/cache.ts#L13)
