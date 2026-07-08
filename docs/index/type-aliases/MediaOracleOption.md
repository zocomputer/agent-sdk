[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MediaOracleOption

# Type Alias: MediaOracleOption

> **MediaOracleOption** = `true` \| [`LookOracleConfig`](../interfaces/LookOracleConfig.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:109](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/tools/look.ts#L109)

The consumer-facing oracle option on `createStdlib` and
`createSandboxFileTools`: `true` selects [DEFAULT\_MEDIA\_ORACLE](../variables/DEFAULT_MEDIA_ORACLE.md), an
object pins a custom oracle. Absent = no `look` tool.
