[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxRunnerOptions

# Interface: SandboxRunnerOptions

Defined in: [packages/agent-sdk/src/sandbox-run.ts:79](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/sandbox-run.ts#L79)

Options for creating a sandbox-backed command runner provider.

## Properties

### resolveSession?

> `optional` **resolveSession?**: (`ctx`) => `PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/sandbox-run.ts:91](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/sandbox-run.ts#L91)

Resolves the sandbox session for one tool call. Defaults to
`ctx.getSandbox()` — the eve session sandbox. Injectable for tests and
for callers that hold a session some other way (e.g. the Builder's
workspace bootstrap).

#### Parameters

##### ctx

[`IoToolContext`](IoToolContext.md) \| `undefined`

#### Returns

`PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

***

### root

> **root**: `string`

Defined in: [packages/agent-sdk/src/sandbox-run.ts:84](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/sandbox-run.ts#L84)

Absolute path of the workspace root **inside the sandbox**. Commands run
from here by default, and `cwd` resolves within it.

***

### spillDir?

> `optional` **spillDir?**: `string`

Defined in: [packages/agent-sdk/src/sandbox-run.ts:99](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/sandbox-run.ts#L99)

Absolute directory **inside the sandbox** for spilled command output.
Omit to disable spilling (truncation markers then carry no file
pointer).
