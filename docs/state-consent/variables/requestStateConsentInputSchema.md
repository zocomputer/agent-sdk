[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-consent](../README.md) / requestStateConsentInputSchema

# Variable: requestStateConsentInputSchema

> `const` **requestStateConsentInputSchema**: `ZodObject`\<\{ `bindingId`: `ZodString`; `declarationName`: `ZodString`; `party`: `ZodObject`\<\{ `external`: `ZodBoolean`; `handle`: `ZodString`; `intentDivergenceNote`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>; `resourceName`: `ZodString`; \}, `$strip`\>

Defined in: [packages/agent-sdk/src/state-consent-envelope.ts:33](https://github.com/zocomputer/zov2-code/blob/b4029c52fbf982f223af7621dd5db23545388982/packages/agent-sdk/src/state-consent-envelope.ts#L33)

The consent envelope the model passes through — structurally the input
chat-core's `parseConsentToolInput` validates on the client. `bindingId` is the
concrete `StateBinding` the Allow grants (the authenticated target for
`POST /state/bindings/:bindingId/grant`); the rest render the card.
