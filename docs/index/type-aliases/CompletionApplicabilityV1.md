[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / CompletionApplicabilityV1

# Type Alias: CompletionApplicabilityV1

> **CompletionApplicabilityV1** = \{ `kind`: `"always"`; \} \| \{ `kind`: `"host-predicate"`; `predicateId`: `string`; \}

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:129](https://github.com/zocomputer/zov2-code/blob/3f99c6555eb919be314852ec3a36b08e02504d85/packages/agent-sdk/src/harness-protocol-v1.ts#L129)

Trusted rule deciding whether a completion contract applies to a turn.

## Union Members

### Type Literal

\{ `kind`: `"always"`; \}

***

### Type Literal

\{ `kind`: `"host-predicate"`; `predicateId`: `string`; \}

#### kind

> `readonly` **kind**: `"host-predicate"`

A host-owned predicate resolved from trusted route and agent context.

#### predicateId

> `readonly` **predicateId**: `string`
