[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MediaOracleOption

# Type Alias: MediaOracleOption

> **MediaOracleOption** = `true` \| [`LookOracleConfig`](../interfaces/LookOracleConfig.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:109](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/tools/look.ts#L109)

The consumer-facing oracle option on `createStdlib` and
`createSandboxFileTools`: `true` selects [DEFAULT\_MEDIA\_ORACLE](../variables/DEFAULT_MEDIA_ORACLE.md), an
object pins a custom oracle. Absent = no `look` tool.
