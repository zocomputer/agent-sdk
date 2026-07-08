[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TOOL\_OUTPUT\_DIRNAME

# Variable: TOOL\_OUTPUT\_DIRNAME

> `const` **TOOL\_OUTPUT\_DIRNAME**: `"tool-outputs"` = `"tool-outputs"`

Defined in: [packages/agent-sdk/src/bounded-output.ts:20](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/bounded-output.ts#L20)

Directory name for spilled tool outputs under the agent's state dir.
Retention sweeps (e.g. rib's) can locate and prune old spills via this.
