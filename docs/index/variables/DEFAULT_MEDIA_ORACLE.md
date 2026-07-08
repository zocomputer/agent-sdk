[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / DEFAULT\_MEDIA\_ORACLE

# Variable: DEFAULT\_MEDIA\_ORACLE

> `const` **DEFAULT\_MEDIA\_ORACLE**: [`LookOracleConfig`](../interfaces/LookOracleConfig.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:98](https://github.com/zocomputer/zov2-code/blob/0bb195a93a5e8bd5814dac23311408353312bc4f/packages/agent-sdk/src/tools/look.ts#L98)

The recommended default oracle: cheap, and the only model family whose
capability set covers every kind the capability-aware copy can route to it
(the google family alone takes video and audio — the gateway catalog's
`vision`/`file-input` tags cover images/PDFs, and the family overlay in
../model-capabilities.ts records the rest). Verified against the live
catalog 2026-07-07; refresh alongside model blurbs, never at build time.
