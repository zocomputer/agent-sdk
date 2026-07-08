[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-consent](../README.md) / buildConsentSteer

# Function: buildConsentSteer()

> **buildConsentSteer**(`envelope`): `string`

Defined in: [packages/agent-sdk/src/state-consent-wrapper.ts:43](https://github.com/zocomputer/zov2-code/blob/0bb195a93a5e8bd5814dac23311408353312bc4f/packages/agent-sdk/src/state-consent-wrapper.ts#L43)

The model-facing instruction returned when a capability needs consent. Names
the tool and embeds the exact args so the model can't fabricate them — the
envelope must round-trip unchanged to chat-core's `parseConsentToolInput`.

## Parameters

### envelope

#### bindingId

`string` = `...`

#### declarationName

`string` = `...`

#### party

\{ `external`: `boolean`; `handle`: `string`; `intentDivergenceNote?`: `string`; \} = `consentPartySchema`

#### party.external

`boolean` = `...`

#### party.handle

`string` = `...`

#### party.intentDivergenceNote?

`string` = `...`

#### resourceName

`string` = `...`

## Returns

`string`
