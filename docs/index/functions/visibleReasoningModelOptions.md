[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / visibleReasoningModelOptions

# Function: visibleReasoningModelOptions()

> **visibleReasoningModelOptions**(`modelId`): [`VisibleReasoningModelOptions`](../interfaces/VisibleReasoningModelOptions.md) \| `undefined`

Defined in: [packages/agent-sdk/src/visible-reasoning.ts:82](https://github.com/zocomputer/zov2-code/blob/e58b3bae5fbd35c5f457130033750c9c33ee334c/packages/agent-sdk/src/visible-reasoning.ts#L82)

The `modelOptions` a gateway model needs for its reasoning to stream as
visible text, or `undefined` when the model's default already streams it
(OpenAI, older Anthropic) or the model is unknown. Spread into
`defineAgent`:

```ts
const modelOptions = visibleReasoningModelOptions(modelId);
return defineAgent({
  model: gateway(modelId),
  reasoning: "medium",
  ...(modelOptions ? { modelOptions } : {}),
});
```

Never returns options that could be rejected: models outside the known-safe
sets get `undefined`, not a guess.

## Parameters

### modelId

`string`

## Returns

[`VisibleReasoningModelOptions`](../interfaces/VisibleReasoningModelOptions.md) \| `undefined`
