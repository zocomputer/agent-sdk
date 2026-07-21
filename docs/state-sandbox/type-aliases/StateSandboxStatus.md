[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxStatus

# Type Alias: StateSandboxStatus

> **StateSandboxStatus** = \{ `status`: `"idle"`; \} \| \{ `handleId`: `string`; `status`: `"resuming"`; \} \| \{ `handleId`: `string`; `status`: `"ready"`; \}

Defined in: [packages/agent-sdk/src/state-sandbox.ts:376](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/state-sandbox.ts#L376)

The lifecycle state of a sandbox client: idle (no handle loaded), resuming (handle loaded but sandbox still waking), or ready.
Transitions from idle to resuming when a handle is requested, then to ready once the session establishes.
