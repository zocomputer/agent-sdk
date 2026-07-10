[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TOOL\_OUTPUT\_DIRNAME

# Variable: TOOL\_OUTPUT\_DIRNAME

> `const` **TOOL\_OUTPUT\_DIRNAME**: `"tool-outputs"` = `"tool-outputs"`

Defined in: [packages/agent-sdk/src/bounded-output.ts:20](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/bounded-output.ts#L20)

Directory name for spilled tool outputs under the agent's state dir.
Retention sweeps (e.g. rib's) can locate and prune old spills via this.
