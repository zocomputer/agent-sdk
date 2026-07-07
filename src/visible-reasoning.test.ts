import { describe, expect, test } from "bun:test";
import { visibleReasoningModelOptions } from "./visible-reasoning";

const ANTHROPIC_ADAPTIVE = {
  providerOptions: {
    anthropic: { thinking: { type: "adaptive", display: "summarized" } },
  },
};

const GOOGLE_THOUGHTS = {
  providerOptions: {
    google: { thinkingConfig: { includeThoughts: true } },
  },
};

describe("visibleReasoningModelOptions", () => {
  test.each([
    "anthropic/claude-fable-5",
    "anthropic/claude-fable-5.1",
    "anthropic/claude-mythos-5",
    "anthropic/claude-mythos-preview",
    "anthropic/claude-opus-4.7",
    "anthropic/claude-opus-4.8",
    "anthropic/claude-opus-4.6",
    "anthropic/claude-opus-4.10",
    "anthropic/claude-sonnet-4.6",
    "anthropic/claude-sonnet-5",
    "anthropic/claude-sonnet-5.2",
    "anthropic/claude-opus-5",
    "anthropic/claude-opus-12",
  ])("adaptive-thinking Anthropic model %s gets adaptive summarized", (modelId) => {
    expect(visibleReasoningModelOptions(modelId)).toEqual(ANTHROPIC_ADAPTIVE);
  });

  // Pre-adaptive Anthropic models reject `thinking.type.adaptive` with a 400
  // (verified live), and stream visible thinking by default — they must get
  // nothing.
  test.each([
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-sonnet-4",
    "anthropic/claude-haiku-4.5",
    "anthropic/claude-opus-4.5",
  ])("pre-adaptive Anthropic model %s gets no options", (modelId) => {
    expect(visibleReasoningModelOptions(modelId)).toBeUndefined();
  });

  test("Gemini 3+ models get includeThoughts", () => {
    expect(visibleReasoningModelOptions("google/gemini-3-pro")).toEqual(GOOGLE_THOUGHTS);
    expect(visibleReasoningModelOptions("google/gemini-3-flash")).toEqual(GOOGLE_THOUGHTS);
    expect(visibleReasoningModelOptions("google/gemini-10-pro")).toEqual(GOOGLE_THOUGHTS);
  });

  test("pre-3 and lite Gemini models get no options (some reject include_thoughts)", () => {
    expect(visibleReasoningModelOptions("google/gemini-2.5-flash-lite")).toBeUndefined();
    expect(visibleReasoningModelOptions("google/gemini-2.0-flash")).toBeUndefined();
  });

  test("OpenAI models get no options (summaries stream by default)", () => {
    expect(visibleReasoningModelOptions("openai/gpt-5.5")).toBeUndefined();
  });

  test("unknown providers and bare ids get no options", () => {
    expect(visibleReasoningModelOptions("xai/grok-5")).toBeUndefined();
    expect(visibleReasoningModelOptions("claude-fable-5")).toBeUndefined();
    expect(visibleReasoningModelOptions("")).toBeUndefined();
  });
});
