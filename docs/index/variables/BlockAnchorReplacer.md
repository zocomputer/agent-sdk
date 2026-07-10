[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / BlockAnchorReplacer

# Variable: BlockAnchorReplacer

> `const` **BlockAnchorReplacer**: [`Replacer`](../type-aliases/Replacer.md)

Defined in: [packages/agent-sdk/src/edit-match.ts:186](https://github.com/zocomputer/zov2-code/blob/0e648df1796b1446eeb67f62d6e2274440971464/packages/agent-sdk/src/edit-match.ts#L186)

First/last trimmed lines as anchors (finds of 3+ lines only); candidate
block size within 25% of the search's; middle lines scored by Levenshtein
similarity with a 0.65 threshold — the best candidate wins.
