[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxFileTools

# Type Alias: SandboxFileTools

> **SandboxFileTools** = `ReturnType`\<*typeof* [`createSandboxFileTools`](../functions/createSandboxFileTools.md)\>

Defined in: [packages/agent-sdk/src/index.ts:549](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/index.ts#L549)

The sandbox file tools return type: workspace, IO provider, runner,
registry, backgroundables, tools (read/edit/write/glob/grep + bash + the
task tools + `look` when the oracle is wired), and the pre-configured
`instructions.stack`.
