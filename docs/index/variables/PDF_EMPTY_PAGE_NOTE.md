[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / PDF\_EMPTY\_PAGE\_NOTE

# Variable: PDF\_EMPTY\_PAGE\_NOTE

> `const` **PDF\_EMPTY\_PAGE\_NOTE**: `"[no text on this page — likely scanned or image-only; rendered pages cannot be attached]"` = `"[no text on this page — likely scanned or image-only; rendered pages cannot be attached]"`

Defined in: [packages/agent-sdk/src/extract/pdf.ts:21](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/extract/pdf.ts#L21)

Shown in place of a page with no text layer. Eve tool results are text/json
only, so the agent can't fall back to rendering the page for the model the
way OpenClaw does — say so instead of showing silent emptiness.
