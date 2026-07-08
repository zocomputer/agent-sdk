[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxIoOptions

# Interface: SandboxIoOptions

Defined in: [packages/agent-sdk/src/sandbox-io.ts:42](https://github.com/zocomputer/zov2-code/blob/d15edc03b49c31d0244c34c64095ce9b88216fe1/packages/agent-sdk/src/sandbox-io.ts#L42)

Options for creating a sandbox-backed workspace I/O provider that executes file operations over an eve session sandbox.

## Properties

### resolveSession?

> `optional` **resolveSession?**: (`ctx`) => `PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/sandbox-io.ts:54](https://github.com/zocomputer/zov2-code/blob/d15edc03b49c31d0244c34c64095ce9b88216fe1/packages/agent-sdk/src/sandbox-io.ts#L54)

Resolves the sandbox session for one tool call. Defaults to
`ctx.getSandbox()` — the eve session sandbox. Injectable for tests and
for callers that hold a session some other way.

#### Parameters

##### ctx

[`IoToolContext`](IoToolContext.md) \| `undefined`

#### Returns

`PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

***

### root

> **root**: `string`

Defined in: [packages/agent-sdk/src/sandbox-io.ts:48](https://github.com/zocomputer/zov2-code/blob/d15edc03b49c31d0244c34c64095ce9b88216fe1/packages/agent-sdk/src/sandbox-io.ts#L48)

Absolute path of the workspace root **inside the sandbox** (e.g.
"/workspace", or the Builder's "/home/daytona/agent"). Must match the
root the tools' `Workspace` was created with.
