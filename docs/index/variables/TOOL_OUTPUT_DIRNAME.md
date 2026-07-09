[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TOOL\_OUTPUT\_DIRNAME

# Variable: TOOL\_OUTPUT\_DIRNAME

> `const` **TOOL\_OUTPUT\_DIRNAME**: `"tool-outputs"` = `"tool-outputs"`

Defined in: [packages/agent-sdk/src/bounded-output.ts:20](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/bounded-output.ts#L20)

Directory name for spilled tool outputs under the agent's state dir.
Retention sweeps (e.g. rib's) can locate and prune old spills via this.
