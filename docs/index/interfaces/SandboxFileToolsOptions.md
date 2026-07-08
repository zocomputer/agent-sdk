[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxFileToolsOptions

# Interface: SandboxFileToolsOptions

Defined in: [packages/agent-sdk/src/index.ts:260](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L260)

Options for the sandbox file tools: workspace root (inside the sandbox),
display noun, session resolver, spill dir, and attachment/media settings.

## Properties

### attachAudioToChat?

> `optional` **attachAudioToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:294](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L294)

See [StdlibOptions.attachAudioToChat](StdlibOptions.md#attachaudiotochat). Defaults to `false`.

***

### attachImagesToChat?

> `optional` **attachImagesToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:288](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L288)

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

Defined in: [packages/agent-sdk/src/index.ts:292](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L292)

See [StdlibOptions.attachVideoToChat](StdlibOptions.md#attachvideotochat). Defaults to `false`.

***

### conventionsFileName?

> `optional` **conventionsFileName?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:300](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L300)

See [StdlibOptions.conventionsFileName](StdlibOptions.md#conventionsfilename). Defaults to "AGENTS.md".

***

### injectDirConventions?

> `optional` **injectDirConventions?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:298](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L298)

See [StdlibOptions.injectDirConventions](StdlibOptions.md#injectdirconventions). Defaults to `true`.

***

### maxInlineImageBytes?

> `optional` **maxInlineImageBytes?**: `number`

Defined in: [packages/agent-sdk/src/index.ts:290](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L290)

See [StdlibOptions.maxInlineImageBytes](StdlibOptions.md#maxinlineimagebytes).

***

### maxInlineMediaBytes?

> `optional` **maxInlineMediaBytes?**: `number`

Defined in: [packages/agent-sdk/src/index.ts:296](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L296)

See [StdlibOptions.maxInlineMediaBytes](StdlibOptions.md#maxinlinemediabytes).

***

### resolveSession?

> `optional` **resolveSession?**: (`ctx`) => `PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/index.ts:272](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L272)

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

Defined in: [packages/agent-sdk/src/index.ts:278](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L278)

Sandbox directory for grep's overflow match lists (spilled through the
sandbox, so the model's follow-up `read` can reach them). Omit to keep
the stop-at-cap behavior.

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:267](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L267)

What tool descriptions call the workspace. Defaults to "workspace".

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/index.ts:265](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L265)

Absolute workspace root **inside the sandbox** (e.g. "/workspace").
File tools refuse paths that escape it.
