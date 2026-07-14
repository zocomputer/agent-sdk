// ../../../../../tmp/agent-sdk-mirror-zYHq0D/repo/src/visible-reasoning.ts
var ANTHROPIC_ADAPTIVE_THINKING_MODELS = [
  /^anthropic\/claude-fable-/,
  /^anthropic\/claude-mythos-/,
  /^anthropic\/claude-(?:opus|sonnet)-4\.(?:[6-9]|\d{2,})/,
  /^anthropic\/claude-(?:opus|sonnet)-(?:[5-9]|\d{2,})/
];
var GOOGLE_THINKING_MODELS = [/^google\/gemini-(?:[3-9]|\d{2,})/];
function visibleReasoningModelOptions(modelId) {
  if (ANTHROPIC_ADAPTIVE_THINKING_MODELS.some((pattern) => pattern.test(modelId))) {
    return {
      providerOptions: {
        anthropic: { thinking: { type: "adaptive", display: "summarized" } }
      }
    };
  }
  if (GOOGLE_THINKING_MODELS.some((pattern) => pattern.test(modelId))) {
    return {
      providerOptions: {
        google: { thinkingConfig: { includeThoughts: true } }
      }
    };
  }
  return;
}
export {
  visibleReasoningModelOptions
};
