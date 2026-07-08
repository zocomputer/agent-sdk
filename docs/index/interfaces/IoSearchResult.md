[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / IoSearchResult

# Interface: IoSearchResult

Defined in: [packages/agent-sdk/src/workspace-io.ts:60](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/workspace-io.ts#L60)

Content-search result: matched lines, a stop reason (false if complete), and
the count of files skipped for size.

## Properties

### matches

> `readonly` **matches**: readonly [`IoSearchMatch`](IoSearchMatch.md)[]

Defined in: [packages/agent-sdk/src/workspace-io.ts:61](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/workspace-io.ts#L61)

***

### skippedLargeFiles

> `readonly` **skippedLargeFiles**: `number` \| `null`

Defined in: [packages/agent-sdk/src/workspace-io.ts:74](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/workspace-io.ts#L74)

Files skipped for being over the search size cap, or `null` when the
backend can't know (a remote searcher enforces the cap but doesn't
report a count). Consumers must omit the figure rather than show 0.

***

### stopped

> `readonly` **stopped**: `false` \| `"max-matches"` \| `"output-cap"`

Defined in: [packages/agent-sdk/src/workspace-io.ts:68](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/workspace-io.ts#L68)

Why the scan ended early, or `false` when it covered everything:
`"max-matches"` = the `maxMatches` bound; `"output-cap"` = a remote
backend's byte cap cut the stream mid-scan (fewer than `maxMatches`
lines were parsed, and more may exist).
