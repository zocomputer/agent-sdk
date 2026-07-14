[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-consent](../README.md) / StateHandleOutcome

# Type Alias: StateHandleOutcome\<THandle\>

> **StateHandleOutcome**\<`THandle`\> = \{ `handle`: `THandle`; `kind`: `"handle"`; \} \| \{ `envelope`: [`StateConsentEnvelope`](StateConsentEnvelope.md); `kind`: `"consent_required"`; `steer`: `string`; \}

Defined in: [packages/agent-sdk/src/state-consent-wrapper.ts:28](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/state-consent-wrapper.ts#L28)

The outcome of a consent-aware handle request: the handle, or a consent steer.

## Type Parameters

### THandle

`THandle`

## Union Members

### Type Literal

\{ `handle`: `THandle`; `kind`: `"handle"`; \}

***

### Type Literal

\{ `envelope`: [`StateConsentEnvelope`](StateConsentEnvelope.md); `kind`: `"consent_required"`; `steer`: `string`; \}

#### envelope

> `readonly` **envelope**: [`StateConsentEnvelope`](StateConsentEnvelope.md)

The envelope to pass verbatim to `request_state_consent`.

#### kind

> `readonly` **kind**: `"consent_required"`

#### steer

> `readonly` **steer**: `string`

The model-facing instruction to render as the tool result.
