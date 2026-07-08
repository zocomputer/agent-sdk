[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-consent](../README.md) / StateHandleOutcome

# Type Alias: StateHandleOutcome\<THandle\>

> **StateHandleOutcome**\<`THandle`\> = \{ `handle`: `THandle`; `kind`: `"handle"`; \} \| \{ `envelope`: [`StateConsentEnvelope`](StateConsentEnvelope.md); `kind`: `"consent_required"`; `steer`: `string`; \}

Defined in: [packages/agent-sdk/src/state-consent-wrapper.ts:28](https://github.com/zocomputer/zov2-code/blob/0bb195a93a5e8bd5814dac23311408353312bc4f/packages/agent-sdk/src/state-consent-wrapper.ts#L28)

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
