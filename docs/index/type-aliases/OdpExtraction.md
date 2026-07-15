[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / OdpExtraction

# Type Alias: OdpExtraction

> **OdpExtraction** = \{ `ok`: `true`; `slides`: `number`; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/odf.ts:19](https://github.com/zocomputer/zov2-code/blob/492659e3281a9b9d11501446d7ec2e941b7da162/packages/agent-sdk/src/extract/odf.ts#L19)

Result of ODP extraction: text with explicit slide markers plus the true
slide count, or a failure reason.
