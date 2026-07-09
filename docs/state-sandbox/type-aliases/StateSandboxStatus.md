[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxStatus

# Type Alias: StateSandboxStatus

> **StateSandboxStatus** = \{ `status`: `"idle"`; \} \| \{ `handleId`: `string`; `status`: `"resuming"`; \} \| \{ `handleId`: `string`; `status`: `"ready"`; \}

Defined in: [packages/agent-sdk/src/state-sandbox.ts:340](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/state-sandbox.ts#L340)

The lifecycle state of a sandbox client: idle (no handle loaded), resuming (handle loaded but sandbox still waking), or ready.
Transitions from idle to resuming when a handle is requested, then to ready once the session establishes.
