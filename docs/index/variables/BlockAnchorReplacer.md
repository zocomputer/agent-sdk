[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / BlockAnchorReplacer

# Variable: BlockAnchorReplacer

> `const` **BlockAnchorReplacer**: [`Replacer`](../type-aliases/Replacer.md)

Defined in: [packages/agent-sdk/src/edit-match.ts:186](https://github.com/zocomputer/zov2-code/blob/1e24004df378afe2dca17754c9e6cedc76f36385/packages/agent-sdk/src/edit-match.ts#L186)

First/last trimmed lines as anchors (finds of 3+ lines only); candidate
block size within 25% of the search's; middle lines scored by Levenshtein
similarity with a 0.65 threshold — the best candidate wins.
