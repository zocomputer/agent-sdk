[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MediaOracleOption

# Type Alias: MediaOracleOption

> **MediaOracleOption** = `true` \| [`LookOracleConfig`](../interfaces/LookOracleConfig.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:109](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/tools/look.ts#L109)

The consumer-facing oracle option on `createStdlib` and
`createSandboxFileTools`: `true` selects [DEFAULT\_MEDIA\_ORACLE](../variables/DEFAULT_MEDIA_ORACLE.md), an
object pins a custom oracle. Absent = no `look` tool.
