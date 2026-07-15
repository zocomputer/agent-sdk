[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxStatus

# Type Alias: StateSandboxStatus

> **StateSandboxStatus** = \{ `status`: `"idle"`; \} \| \{ `handleId`: `string`; `status`: `"resuming"`; \} \| \{ `handleId`: `string`; `status`: `"ready"`; \}

Defined in: [packages/agent-sdk/src/state-sandbox.ts:340](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/state-sandbox.ts#L340)

The lifecycle state of a sandbox client: idle (no handle loaded), resuming (handle loaded but sandbox still waking), or ready.
Transitions from idle to resuming when a handle is requested, then to ready once the session establishes.
