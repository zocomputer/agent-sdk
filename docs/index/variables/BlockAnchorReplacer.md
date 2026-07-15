[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / BlockAnchorReplacer

# Variable: BlockAnchorReplacer

> `const` **BlockAnchorReplacer**: [`Replacer`](../type-aliases/Replacer.md)

Defined in: [packages/agent-sdk/src/edit-match.ts:186](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/edit-match.ts#L186)

First/last trimmed lines as anchors (finds of 3+ lines only); candidate
block size within 25% of the search's; middle lines scored by Levenshtein
similarity with a 0.65 threshold — the best candidate wins.
