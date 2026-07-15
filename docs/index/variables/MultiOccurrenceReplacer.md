[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MultiOccurrenceReplacer

# Variable: MultiOccurrenceReplacer

> `const` **MultiOccurrenceReplacer**: [`Replacer`](../type-aliases/Replacer.md)

Defined in: [packages/agent-sdk/src/edit-match.ts:440](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/edit-match.ts#L440)

Yields every exact occurrence of the find. In-cascade this is shadowed by
SimpleReplacer (which already yields the find, and `replace_all` replaces
every occurrence of whichever candidate matched); kept for order parity
with opencode and for direct use.
