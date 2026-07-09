[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxFileToolsOptions

# Interface: SandboxFileToolsOptions

Defined in: [packages/agent-sdk/src/index.ts:409](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L409)

Options for the sandbox file tools: workspace root (inside the sandbox),
display noun, session resolver, spill dir, and attachment/media settings.

## Properties

### attachAudioToChat?

> `optional` **attachAudioToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:443](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L443)

See [StdlibOptions.attachAudioToChat](StdlibOptions.md#attachaudiotochat). Defaults to `false`.

***

### attachImagesToChat?

> `optional` **attachImagesToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:437](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L437)

See [StdlibOptions.attachImagesToChat](StdlibOptions.md#attachimagestochat). Defaults to `false` here —
the attachment path only works when the agent registers
`createParkDeliveryHook` AND its runtime can reach itself over loopback
to send the next-turn message; hosted serverless runtimes haven't
validated that leg. Until a consumer wires and verifies it, the honest
default is the metadata-only note (a "queued" promise that never
delivers is the silent failure the attachment contract exists to avoid).

***

### attachVideoToChat?

> `optional` **attachVideoToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:441](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L441)

See [StdlibOptions.attachVideoToChat](StdlibOptions.md#attachvideotochat). Defaults to `false`.

***

### conventionsFileName?

> `optional` **conventionsFileName?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:449](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L449)

See [StdlibOptions.conventionsFileName](StdlibOptions.md#conventionsfilename). Defaults to "AGENTS.md".

***

### injectDirConventions?

> `optional` **injectDirConventions?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:447](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L447)

See [StdlibOptions.injectDirConventions](StdlibOptions.md#injectdirconventions). Defaults to `true`.

***

### maxInlineImageBytes?

> `optional` **maxInlineImageBytes?**: `number`

Defined in: [packages/agent-sdk/src/index.ts:439](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L439)

See [StdlibOptions.maxInlineImageBytes](StdlibOptions.md#maxinlineimagebytes).

***

### maxInlineMediaBytes?

> `optional` **maxInlineMediaBytes?**: `number`

Defined in: [packages/agent-sdk/src/index.ts:445](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L445)

See [StdlibOptions.maxInlineMediaBytes](StdlibOptions.md#maxinlinemediabytes).

***

### mediaOracle?

> `optional` **mediaOracle?**: [`MediaOracleOption`](../type-aliases/MediaOracleOption.md)

Defined in: [packages/agent-sdk/src/index.ts:456](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L456)

See [StdlibOptions.mediaOracle](StdlibOptions.md#mediaoracle). The sandbox `look` reads bytes
through the sandbox session, so the oracle sees the session workspace's
files. Hosted Zo deployments pass `headers: { "x-zo-tool": "look" }` on
the config so the runtime proxy labels the tool's own model traffic.

***

### resolveSession?

> `optional` **resolveSession?**: (`ctx`) => `PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/index.ts:421](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L421)

Resolves the sandbox session for one tool call. Defaults to
`ctx.getSandbox()`; injectable for tests.

#### Parameters

##### ctx

[`IoToolContext`](IoToolContext.md) \| `undefined`

#### Returns

`PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

***

### spillDir?

> `optional` **spillDir?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:427](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L427)

Sandbox directory for grep's overflow match lists (spilled through the
sandbox, so the model's follow-up `read` can reach them). Omit to keep
the stop-at-cap behavior.

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:416](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L416)

What tool descriptions call the workspace. Defaults to "workspace".

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/index.ts:414](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/index.ts#L414)

Absolute workspace root **inside the sandbox** (e.g. "/workspace").
File tools refuse paths that escape it.
