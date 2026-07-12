[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxFileTools

# Type Alias: SandboxFileTools

> **SandboxFileTools** = `ReturnType`\<*typeof* [`createSandboxFileTools`](../functions/createSandboxFileTools.md)\>

Defined in: [packages/agent-sdk/src/index.ts:549](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L549)

The sandbox file tools return type: workspace, IO provider, runner,
registry, backgroundables, tools (read/edit/write/glob/grep + bash + the
task tools + `look` when the oracle is wired), and the pre-configured
`instructions.stack`.
