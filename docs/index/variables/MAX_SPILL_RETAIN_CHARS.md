[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MAX\_SPILL\_RETAIN\_CHARS

# Variable: MAX\_SPILL\_RETAIN\_CHARS

> `const` **MAX\_SPILL\_RETAIN\_CHARS**: `number`

Defined in: [packages/agent-sdk/src/sandbox-run.ts:69](https://github.com/zocomputer/zov2-code/blob/760605b8ac267b8d97156760bb2d6e6d1b69ada8/packages/agent-sdk/src/sandbox-run.ts#L69)

Host-memory retention cap per stream for the settle-time spill. Output
beyond this is no longer retained in full, so a truncated result renders
its marker without a spill label — honest "output truncated" with no
pointer beats a pointer to a partial file.
