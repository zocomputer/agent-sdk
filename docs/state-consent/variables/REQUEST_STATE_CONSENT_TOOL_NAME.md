[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-consent](../README.md) / REQUEST\_STATE\_CONSENT\_TOOL\_NAME

# Variable: REQUEST\_STATE\_CONSENT\_TOOL\_NAME

> `const` **REQUEST\_STATE\_CONSENT\_TOOL\_NAME**: `"request_state_consent"` = `"request_state_consent"`

Defined in: [packages/agent-sdk/src/state-consent-envelope.ts:18](https://github.com/zocomputer/zov2-code/blob/d22a2863f30f9fa1a7f8dbb051f97b4846076bf1/packages/agent-sdk/src/state-consent-envelope.ts#L18)

The wire name the state capability bundles. Defined here (agent-sdk has no
chat-core dependency) and MUST equal chat-core's `REQUEST_STATE_CONSENT_TOOL_NAME`
so the consent projection keys on the same string. The authored template file
(`agent/tools/request_state_consent.ts`) carries this name via its filename.
