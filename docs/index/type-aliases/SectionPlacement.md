[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SectionPlacement

# Type Alias: SectionPlacement

> **SectionPlacement** = \{ `before`: `string`; \} \| \{ `after`: `string`; \}

Defined in: [packages/agent-sdk/src/prompt-sections.ts:64](https://github.com/zocomputer/zov2-code/blob/07721c227b11c8cc8115ab6c09048e903415a342/packages/agent-sdk/src/prompt-sections.ts#L64)

Where an extra section lands relative to a baseline section id:
`{ before: id }` or `{ after: id }`. An unknown (or omitted) anchor appends
the section at the end — a consumer typo degrades to "last", never a throw.
