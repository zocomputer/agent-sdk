[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-consent](../README.md) / requestStateFilesHandleWithConsent

# Function: requestStateFilesHandleWithConsent()

> **requestStateFilesHandleWithConsent**(`options`): `Promise`\<[`StateHandleOutcome`](../type-aliases/StateHandleOutcome.md)\<[`StateFilesHandle`](../../state-files/interfaces/StateFilesHandle.md)\>\>

Defined in: [packages/agent-sdk/src/state-consent-wrapper.ts:60](https://github.com/zocomputer/zov2-code/blob/2480a6ef0f68d759f57bf84a8fcb14c879dd765d/packages/agent-sdk/src/state-consent-wrapper.ts#L60)

Request a state-FILES handle, turning a `consent_required` gate into a steer.
Re-throws every other `StateFilesHandleError` (and any non-consent error) — a
broken broker is a real failure, not a consent prompt. A `consent_required`
whose 409 lacked a parseable envelope also re-throws: without the envelope the
model has nothing valid to pass, so surfacing the raw error beats a steer the
model can't act on.

## Parameters

### options

[`RequestStateFilesHandleOptions`](../../state-files/interfaces/RequestStateFilesHandleOptions.md)

## Returns

`Promise`\<[`StateHandleOutcome`](../type-aliases/StateHandleOutcome.md)\<[`StateFilesHandle`](../../state-files/interfaces/StateFilesHandle.md)\>\>
