[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-consent](../README.md) / createRequestStateConsentTool

# Function: createRequestStateConsentTool()

> **createRequestStateConsentTool**(): `ToolDefinition`\<\{ `bindingId`: `string`; `declarationName`: `string`; `party`: \{ `external`: `boolean`; `handle`: `string`; `intentDivergenceNote?`: `string`; \}; `resourceName`: `string`; \}, `string`\>

Defined in: [packages/agent-sdk/src/state-consent-tool.ts:33](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/state-consent-tool.ts#L33)

Build the `request_state_consent` tool. The template re-exports this from
`agent/tools/request_state_consent.ts` so the filename fixes the wire name.

## Returns

`ToolDefinition`\<\{ `bindingId`: `string`; `declarationName`: `string`; `party`: \{ `external`: `boolean`; `handle`: `string`; `intentDivergenceNote?`: `string`; \}; `resourceName`: `string`; \}, `string`\>
