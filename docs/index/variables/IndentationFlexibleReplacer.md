[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / IndentationFlexibleReplacer

# Variable: IndentationFlexibleReplacer

> `const` **IndentationFlexibleReplacer**: [`Replacer`](../type-aliases/Replacer.md)

Defined in: [packages/agent-sdk/src/edit-match.ts:288](https://github.com/zocomputer/zov2-code/blob/760605b8ac267b8d97156760bb2d6e6d1b69ada8/packages/agent-sdk/src/edit-match.ts#L288)

Strips the common minimum indentation from both sides before block
comparison — the "model re-indented the snippet" case. In-cascade this is
shadowed by LineTrimmedReplacer (per-line trim-equality is strictly more
forgiving than common-indent removal); kept for order parity with
opencode and for direct use.
