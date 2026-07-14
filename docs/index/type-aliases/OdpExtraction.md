[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / OdpExtraction

# Type Alias: OdpExtraction

> **OdpExtraction** = \{ `ok`: `true`; `slides`: `number`; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/odf.ts:19](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/extract/odf.ts#L19)

Result of ODP extraction: text with explicit slide markers plus the true
slide count, or a failure reason.
