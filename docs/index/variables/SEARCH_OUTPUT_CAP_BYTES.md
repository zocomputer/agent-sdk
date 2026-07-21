[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SEARCH\_OUTPUT\_CAP\_BYTES

# Variable: SEARCH\_OUTPUT\_CAP\_BYTES

> `const` **SEARCH\_OUTPUT\_CAP\_BYTES**: `number`

Defined in: [packages/agent-sdk/src/sandbox-io.ts:266](https://github.com/zocomputer/zov2-code/blob/3530b39a94e929be74c3d9202bace84f47b21b44/packages/agent-sdk/src/sandbox-io.ts#L266)

Total-output cap on a remote search. `--max-count` only bounds matches per
FILE, so many matching files could otherwise stream an unbounded stdout
over the sandbox transport before the parser truncates. 10 MiB holds far
more lines than any match cap needs while bounding the transfer.
