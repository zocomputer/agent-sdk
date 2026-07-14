[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SectionPlacement

# Type Alias: SectionPlacement

> **SectionPlacement** = \{ `before`: `string`; \} \| \{ `after`: `string`; \}

Defined in: [packages/agent-sdk/src/prompt-sections.ts:64](https://github.com/zocomputer/zov2-code/blob/2f6c8cc3fd1672c6cd6d12c28dbf229ac82949b0/packages/agent-sdk/src/prompt-sections.ts#L64)

Where an extra section lands relative to a baseline section id:
`{ before: id }` or `{ after: id }`. An unknown (or omitted) anchor appends
the section at the end — a consumer typo degrades to "last", never a throw.
