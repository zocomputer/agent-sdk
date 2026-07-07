// Provider options that make a model's reasoning stream as VISIBLE text.
//
// `defineAgent`'s `reasoning` effort turns extended thinking on, but on some
// gateway models the thinking arrives hidden by default — the stream carries
// reasoning parts whose text is empty (Anthropic returns encrypted thinking:
// one empty delta plus a signature in providerMetadata; Gemini omits thoughts
// entirely unless asked). eve dutifully emits empty `reasoning.appended`
// events, chat-core drops empty reasoning parts, and the UI never shows a
// "Thinking…" block — the agent looks stalled for the whole reasoning phase.
//
// Hidden-by-default is the EXCEPTION, not the rule. Surveyed live against the
// gateway 2026-07-07 (plus provider docs); with plain `reasoning: "medium"`:
//
// - HIDDEN — anthropic Fable 5 / Mythos 5 / Sonnet 5 / Opus 4.7+: thinking
//   `display` defaults to `"omitted"` on these models (per Anthropic's
//   extended-thinking docs) — the block opens, one signature delta arrives,
//   and it closes with no text. `display: "summarized"` opts back in.
// - HIDDEN — google Gemini 3: no thoughts without
//   `thinkingConfig.includeThoughts`.
// - VISIBLE — anthropic Sonnet/Opus 4.6 and older (summarized by default;
//   4.5-and-older also reject `thinking.type.adaptive` with a 400, so they
//   must get no options), openai GPT-5.x (the gateway defaults
//   `reasoningSummary`), xai Grok 4.3 (reasoning summaries), and the
//   `reasoning_content` providers — deepseek v4, zai GLM 5.x, moonshotai
//   Kimi K2.x, minimax M3, alibaba Qwen thinking models, mistral Magistral.
// - NO-OP / FOOTGUN — meta Llama ignores the effort knob; alibaba qwen3-max
//   is a non-thinking model; amazon Nova 2 REJECTS the `reasoning` effort
//   knob outright through the gateway (400, malformed reasoningConfig) — a
//   separate gotcha this module can't fix (see the GUIDE).
//
// Dependency-free on purpose (the lib-modules-stay-framework-free rule): the
// return shape is structurally what eve's `modelOptions.providerOptions`
// accepts. `createTaskAgent` applies this automatically; a top-level agent
// spreads it into `defineAgent` — see the GUIDE's "Visible reasoning".

/**
 * Anthropic models whose thinking `display` defaults to `"omitted"` (Fable,
 * Mythos, Sonnet 5+, Opus 4.7+), plus the 4.6 generation — 4.6 streams
 * summarized thinking by default, but accepts `adaptive` and is included for
 * uniform behavior, matching how production Zo configures it. Older models
 * (sonnet-4.5, haiku-4.5, …) reject `thinking.type.adaptive` with a 400 and
 * stream visible thinking by default, so they must stay OFF this list.
 * Extend it when a new Anthropic model family ships (new families have
 * defaulted to omitted since Opus 4.7).
 */
const ANTHROPIC_ADAPTIVE_THINKING_MODELS: readonly RegExp[] = [
  /^anthropic\/claude-fable-/,
  /^anthropic\/claude-mythos-/,
  // Opus/Sonnet 4.6+ (any minor, incl. double-digit like 4.10) and 5+.
  /^anthropic\/claude-(?:opus|sonnet)-4\.(?:[6-9]|\d{2,})/,
  /^anthropic\/claude-(?:opus|sonnet)-(?:[5-9]|\d{2,})/,
];

/**
 * Gemini generations verified to accept `thinkingConfig.includeThoughts`
 * (thinking is always on for them). Scoped rather than all `google/*`: some
 * older/lite Gemini models reject `include_thoughts` outright, and the
 * contract here is to never return options a model would refuse.
 */
const GOOGLE_THINKING_MODELS: readonly RegExp[] = [/^google\/gemini-(?:[3-9]|\d{2,})/];

/** A JSON value, mirrored from eve (structurally compatible) so this module stays dependency-free. */
export type VisibleReasoningJsonValue =
  | string
  | number
  | boolean
  | null
  | VisibleReasoningJsonValue[]
  | { [key: string]: VisibleReasoningJsonValue };

/** The `modelOptions` value for `defineAgent` — eve's provider-options shape. */
export interface VisibleReasoningModelOptions {
  readonly providerOptions: Record<string, { [key: string]: VisibleReasoningJsonValue }>;
}

/**
 * The `modelOptions` a gateway model needs for its reasoning to stream as
 * visible text, or `undefined` when the model's default already streams it
 * (OpenAI, older Anthropic) or the model is unknown. Spread into
 * `defineAgent`:
 *
 * ```ts
 * const modelOptions = visibleReasoningModelOptions(modelId);
 * return defineAgent({
 *   model: gateway(modelId),
 *   reasoning: "medium",
 *   ...(modelOptions ? { modelOptions } : {}),
 * });
 * ```
 *
 * Never returns options that could be rejected: models outside the known-safe
 * sets get `undefined`, not a guess.
 */
export function visibleReasoningModelOptions(
  modelId: string,
): VisibleReasoningModelOptions | undefined {
  if (ANTHROPIC_ADAPTIVE_THINKING_MODELS.some((pattern) => pattern.test(modelId))) {
    return {
      providerOptions: {
        anthropic: { thinking: { type: "adaptive", display: "summarized" } },
      },
    };
  }
  if (GOOGLE_THINKING_MODELS.some((pattern) => pattern.test(modelId))) {
    return {
      providerOptions: {
        google: { thinkingConfig: { includeThoughts: true } },
      },
    };
  }
  return undefined;
}
