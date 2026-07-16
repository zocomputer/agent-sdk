[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / LookOracleConfig

# Interface: LookOracleConfig

Defined in: [packages/agent-sdk/src/tools/look.ts:60](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/tools/look.ts#L60)

One oracle configuration: the pinned model, its display name, its input
capabilities (drives both the refusal logic and the tool description), and
optional per-call headers for the generate call.

## Properties

### capabilities

> **capabilities**: [`ModelInputCapabilities`](ModelInputCapabilities.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:74](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/tools/look.ts#L74)

What the oracle can view. The tool refuses kinds outside this set with
an error naming it, and the description advertises exactly this set —
resolve it with `capabilitiesForModel` (../model-capabilities.ts) in a
one-shot refresh script and check the result in.

***

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [packages/agent-sdk/src/tools/look.ts:80](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/tools/look.ts#L80)

Extra headers on every generate call. How a metered deployment labels
the tool's own model traffic (Zo passes `{ "x-zo-tool": "look" }`);
forwarded opaquely.

***

### model

> **model**: `LanguageModel`

Defined in: [packages/agent-sdk/src/tools/look.ts:65](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/tools/look.ts#L65)

The oracle model — a gateway slug (resolved through the AI SDK's default
provider) or a `LanguageModel` instance.

***

### modelName

> **modelName**: `string`

Defined in: [packages/agent-sdk/src/tools/look.ts:67](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/tools/look.ts#L67)

Display name baked into the tool description (e.g. "Gemini 3 Flash").

***

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [packages/agent-sdk/src/tools/look.ts:87](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/tools/look.ts#L87)

Total timeout for the generate call, ms. Defaults to
[DEFAULT\_LOOK\_TIMEOUT\_MS](../variables/DEFAULT_LOOK_TIMEOUT_MS.md) — the tool's substitute for the stream
guards the session model's own fetch carries: a dead or stalled gateway
connection errors instead of hanging the turn.
