[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxFileTools

# Type Alias: SandboxFileTools

> **SandboxFileTools** = `ReturnType`\<*typeof* [`createSandboxFileTools`](../functions/createSandboxFileTools.md)\>

Defined in: [packages/agent-sdk/src/index.ts:647](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L647)

The sandbox file tools return type: workspace, IO provider, runner,
registry, backgroundables, tools (read/edit/write/glob/grep + bash + the
task tools + `look` when the oracle is wired), and the pre-configured
`instructions.stack`.
