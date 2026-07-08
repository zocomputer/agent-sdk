[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MediaOracleOption

# Type Alias: MediaOracleOption

> **MediaOracleOption** = `true` \| [`LookOracleConfig`](../interfaces/LookOracleConfig.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:109](https://github.com/zocomputer/zov2-code/blob/d15edc03b49c31d0244c34c64095ce9b88216fe1/packages/agent-sdk/src/tools/look.ts#L109)

The consumer-facing oracle option on `createStdlib` and
`createSandboxFileTools`: `true` selects [DEFAULT\_MEDIA\_ORACLE](../variables/DEFAULT_MEDIA_ORACLE.md), an
object pins a custom oracle. Absent = no `look` tool.
