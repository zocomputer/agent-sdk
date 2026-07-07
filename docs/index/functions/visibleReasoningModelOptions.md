[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / visibleReasoningModelOptions

# Function: visibleReasoningModelOptions()

> **visibleReasoningModelOptions**(`modelId`): [`VisibleReasoningModelOptions`](../interfaces/VisibleReasoningModelOptions.md) \| `undefined`

Defined in: [packages/agent-sdk/src/visible-reasoning.ts:94](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/visible-reasoning.ts#L94)

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
