[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / DEFAULT\_LOOK\_TIMEOUT\_MS

# Variable: DEFAULT\_LOOK\_TIMEOUT\_MS

> `const` **DEFAULT\_LOOK\_TIMEOUT\_MS**: `180000` = `180_000`

Defined in: [packages/agent-sdk/src/tools/look.ts:50](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/tools/look.ts#L50)

Default total timeout for the oracle call, in ms. The session model's own
calls ride a guarded fetch (see ../gateway-fetch.ts) so a dead connection
errors into a retry, but `look`'s one-shot `generateText` runs on the
provider's plain fetch — without a cap, a stalled gateway hangs the whole
turn. Three minutes is generous for a 20 MiB upload + analysis (a real
video round-trip measures single-digit seconds) while staying under the
~4-minute window past which a blocked tool call also expires the
provider's prompt cache.
