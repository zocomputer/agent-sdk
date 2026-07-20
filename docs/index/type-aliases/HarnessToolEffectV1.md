[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / HarnessToolEffectV1

# Type Alias: HarnessToolEffectV1

> **HarnessToolEffectV1** = \{ `kind`: `"none"`; \} \| \{ `kind`: `"read"`; `scope`: `"workspace"` \| `"external"`; \} \| \{ `kind`: `"write"`; `scope`: `"workspace"` \| `"external"`; \} \| \{ `kind`: `"process"`; \}

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:24](https://github.com/zocomputer/zov2-code/blob/3f99c6555eb919be314852ec3a36b08e02504d85/packages/agent-sdk/src/harness-protocol-v1.ts#L24)

Effect class used by hosts to apply trusted execution and rendering policy.
