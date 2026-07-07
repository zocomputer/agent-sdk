[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxStatus

# Type Alias: StateSandboxStatus

> **StateSandboxStatus** = \{ `status`: `"idle"`; \} \| \{ `handleId`: `string`; `status`: `"resuming"`; \} \| \{ `handleId`: `string`; `status`: `"ready"`; \}

Defined in: [packages/agent-sdk/src/state-sandbox.ts:331](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/state-sandbox.ts#L331)

The lifecycle state of a sandbox client: idle (no handle loaded), resuming (handle loaded but sandbox still waking), or ready.
Transitions from idle to resuming when a handle is requested, then to ready once the session establishes.
