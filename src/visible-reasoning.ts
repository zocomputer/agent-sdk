// Provider options that make a model's reasoning stream as VISIBLE text.
//
// `defineAgent`'s `reasoning` effort turns extended thinking on, but on
// several gateway models the thinking arrives hidden by default — the stream
// carries reasoning parts whose text is empty (Anthropic's adaptive-thinking
// generation returns encrypted thinking: one empty delta plus a signature in
// providerMetadata; Gemini omits thoughts entirely unless asked). eve dutifully
// emits empty `reasoning.appended` events, chat-core drops empty reasoning
// parts, and the UI never shows a "Thinking…" block — the agent looks stalled
// for the whole reasoning phase. Verified live against the gateway 2026-07-07:
//
// - anthropic/claude-fable-5, claude-opus-4.8, claude-sonnet-5: encrypted with
//   plain `reasoning: "medium"`; visible with
//   `thinking: { type: "adaptive", display: "summarized" }`.
// - anthropic/claude-sonnet-4.6: visible either way (adaptive accepted).
// - anthropic/claude-sonnet-4.5 and older: reject `thinking.type.adaptive`
//   with a 400 — and stream visible thinking by default, so they get nothing.
// - google/gemini-3-pro: hidden without `thinkingConfig.includeThoughts`.
// - openai/gpt-5.5: reasoning summaries stream by default; nothing needed.
//
// Dependency-free on purpose (the lib-modules-stay-framework-free rule): the
// return shape is structurally what eve's `modelOptions.providerOptions`
// accepts. `createTaskAgent` applies this automatically; a top-level agent
// spreads it into `defineAgent` — see the GUIDE's "Visible reasoning".

/**
 * Anthropic models in the adaptive-thinking generation. These accept
 * `thinking: { type: "adaptive" }` and default to encrypted thinking through
 * the gateway (except sonnet-4.6, which is visible either way — included for
 * uniform summarized display, matching how production Zo configures it).
 * Older models (sonnet-4.5, haiku-4.5, …) reject `adaptive` with a 400 and
 * stream visible thinking by default, so they must stay OFF this list.
 * Extend it when a new Anthropic generation ships.
 */
const ANTHROPIC_ADAPTIVE_THINKING_MODELS: readonly RegExp[] = [
  /^anthropic\/claude-fable-/,
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
