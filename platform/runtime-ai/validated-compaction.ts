/**
 * Validated compaction: judge-and-repair for eve's context-compaction summaries.
 *
 * A deliberate line-for-line duplicate of
 * `@zocomputer/agent-sdk/validated-compaction` — this package is vendored
 * self-contained into the agent working copy (same rationale as
 * `ZO_TOOL_HEADER` and session-fetch's header constants), and the vendored
 * copy resolves only `ai` + Node built-ins, not `@ai-sdk/provider`, so the
 * model types are derived from `createGateway` instead of imported. The
 * sibling drift-pin test (`validated-compaction.test.ts`) locks the constants,
 * the prompt, and the behavior to the agent-sdk implementation — change them
 * together.
 *
 * Why this exists (see the agent-sdk module for the full story): eve compacts
 * a long conversation by asking the turn model for a summary of the older
 * messages, then replacing them with it — unvalidated. The Slipstream paper
 * (arXiv:2605.08580) measures exactly this failure: unvalidated compaction
 * silently drops load-bearing facts. {@link withValidatedCompaction} wraps the
 * turn model, detects eve's compaction call by {@link COMPACTION_SENTINEL},
 * asks the same model to audit the fresh summary against the original
 * transcript, and appends any missing facts as a
 * {@link RECOVERED_CONTEXT_HEADER} section. Fail-open throughout.
 *
 * {@link withValidatedCompactionProvider} lifts the wrap to the provider
 * (`register.ts` installs it on the `AI_SDK_DEFAULT_PROVIDER` slot): agents
 * keep authoring bare string model slugs — eve still classifies them as
 * gateway-routed, so web_search and window auto-resolve survive — and the
 * validation attaches where `ai` resolves the string to a model.
 */
import type { createGateway } from "ai";

/** The gateway provider, as `zoGateway` returns it. */
type GatewayProvider = ReturnType<typeof createGateway>;
/** The gateway's language model — structurally `LanguageModelV4`. */
type GatewayLanguageModel = ReturnType<GatewayProvider["languageModel"]>;
type GatewayCallOptions = Parameters<GatewayLanguageModel["doGenerate"]>[0];
type GatewayGenerateResult = Awaited<
  ReturnType<GatewayLanguageModel["doGenerate"]>
>;
type GatewayContent = GatewayGenerateResult["content"][number];
type GatewayPrompt = GatewayCallOptions["prompt"];

/**
 * The opening sentence of eve's compaction system prompt, used to recognize a
 * compaction call on the wrapped model.
 *
 * eve's `COMPACTION_SYSTEM_PROMPT` (dist `src/harness/compaction.js`) starts
 * with exactly this sentence; agent-sdk's pin test drives eve's real
 * `compactMessages` through the facade to keep this string honest against eve
 * upgrades, and the sibling drift-pin test keeps this copy equal to it.
 */
export const COMPACTION_SENTINEL = "You are a conversation summarizer.";

/**
 * Heading of the section {@link withValidatedCompaction} appends to a summary
 * when the judge finds facts the summary dropped. Exported so tests and log
 * scrapers can recognize a repaired summary.
 */
export const RECOVERED_CONTEXT_HEADER = "## Recovered context (compaction audit)";

/** Default cap on the appended recovery section, in characters. */
export const DEFAULT_MAX_RECOVERED_CHARS = 2000;

/** Default cap on how many judge-reported facts are appended. */
export const DEFAULT_MAX_RECOVERED_FACTS = 12;

/** Default `maxOutputTokens` for the judge call. */
export const DEFAULT_JUDGE_MAX_OUTPUT_TOKENS = 1024;

/**
 * Default judge-call timeout in milliseconds. Compaction already costs one
 * model call; the judge call is the "slight delay" the validation trades for
 * summary quality, and past this budget the facade fails open instead of
 * holding the turn.
 */
export const DEFAULT_JUDGE_TIMEOUT_MS = 60_000;

/**
 * What the validation did to one compaction call, delivered to
 * {@link ValidatedCompactionOptions.onValidation}.
 *
 * - `nothing-missing` — the judge found no dropped facts (or reported facts
 *   that didn't fit even one bullet under `maxRecoveredChars`); the summary
 *   passed through unchanged. `judgeText` is the judge's raw reply.
 * - `repaired` — `facts` were appended as a {@link RECOVERED_CONTEXT_HEADER}
 *   section (`appendedChars` characters including the separating blank line);
 *   `truncated` means the caps cut the judge's list short.
 * - `judge-error` — the judge call failed or timed out; the summary passed
 *   through unchanged (fail-open).
 * - `skipped` — the compaction call had no user-message transcript to audit
 *   against, or produced no summary text to audit.
 */
export type CompactionValidationReport =
  | { kind: "nothing-missing"; judgeText: string }
  | {
      kind: "repaired";
      facts: readonly string[];
      truncated: boolean;
      appendedChars: number;
    }
  | { kind: "judge-error"; error: unknown }
  | { kind: "skipped"; reason: "no-transcript" | "no-summary-text" };

/** Options for {@link withValidatedCompaction}. */
export interface ValidatedCompactionOptions {
  /**
   * The judge's system prompt. Defaults to
   * {@link buildValidationSystemPrompt} over `maxRecoveredFacts`. Replace it to
   * tune what counts as a load-bearing fact for your agent — keep the reply
   * contract (`NOTHING MISSING`, or `- ` bullet lines) or
   * {@link parseJudgeVerdict} will read every reply as nothing-missing.
   */
  validationSystemPrompt?: string;
  /**
   * Cap on the appended recovery section, in characters. Facts are kept
   * whole — the last one that would cross the cap is dropped, not clipped.
   * Defaults to {@link DEFAULT_MAX_RECOVERED_CHARS}.
   */
  maxRecoveredChars?: number;
  /**
   * Cap on how many judge-reported facts are considered (the judge is told to
   * order most-important-first). Defaults to
   * {@link DEFAULT_MAX_RECOVERED_FACTS}.
   */
  maxRecoveredFacts?: number;
  /**
   * `maxOutputTokens` for the judge call. Defaults to
   * {@link DEFAULT_JUDGE_MAX_OUTPUT_TOKENS}.
   */
  judgeMaxOutputTokens?: number;
  /**
   * Judge-call timeout in milliseconds; on expiry the facade fails open.
   * Defaults to {@link DEFAULT_JUDGE_TIMEOUT_MS}.
   */
  judgeTimeoutMs?: number;
  /**
   * Observer for each validated compaction. Called once per intercepted
   * compaction call with the {@link CompactionValidationReport}; exceptions it
   * throws are swallowed (observability must not fail the compaction).
   */
  onValidation?: (report: CompactionValidationReport) => void;
}

/**
 * Build the default judge system prompt, telling the model to audit a summary
 * against its source transcript and reply `NOTHING MISSING` or at most
 * `maxFacts` `- ` bullet lines of concrete dropped facts. The fact taxonomy
 * (goals/status, modified files, decisions, constraints, pending verification,
 * exact identifiers) follows what the Slipstream paper (arXiv:2605.08580)
 * found compaction drops.
 */
export function buildValidationSystemPrompt(maxFacts: number): string {
  return [
    "You audit conversation summaries for information loss.",
    "You will receive the original conversation transcript and a candidate summary of it.",
    "Identify concrete, load-bearing facts present in the transcript but missing from the summary:",
    "task goals and their status, files or paths modified, decisions and their reasons, constraints,",
    "open questions, pending verification steps, exact identifiers (names, commands, versions, URLs).",
    "Reply with exactly `NOTHING MISSING` if the summary preserves everything needed.",
    "Otherwise reply with one missing fact per line, each line starting with `- `,",
    `most important first, at most ${maxFacts} lines, no other text.`,
  ].join(" ");
}

/**
 * Parse a judge reply into a verdict. Total — any string parses: a trimmed
 * `NOTHING MISSING` (case-insensitive, optional trailing punctuation) or a
 * reply containing no `- `/`* ` bullet lines is nothing-missing; otherwise the
 * bullet lines are the missing facts, in reply order, uncapped (the facade
 * applies `maxRecoveredFacts`).
 */
export function parseJudgeVerdict(
  text: string,
): { kind: "nothing-missing" } | { kind: "missing"; facts: readonly string[] } {
  if (/^nothing missing[.!]?$/i.test(text.trim())) {
    return { kind: "nothing-missing" };
  }
  const facts: string[] = [];
  for (const line of text.split("\n")) {
    const match = /^\s*[-*]\s+(.+)$/.exec(line);
    const fact = match?.[1]?.trim();
    if (fact !== undefined && fact !== "") facts.push(fact);
  }
  if (facts.length === 0) return { kind: "nothing-missing" };
  return { kind: "missing", facts };
}

/**
 * Render recovered facts as the section appended to a repaired summary: the
 * {@link RECOVERED_CONTEXT_HEADER}, an intro line, and one `- ` bullet per
 * fact. Facts are kept whole under `maxChars` — bullets are added in order
 * until the next would cross the cap. Returns `null` when not even the first
 * bullet fits (or `facts` is empty); `truncated` is true iff some facts were
 * dropped (`kept` below the fact count).
 */
export function buildRecoverySection(
  facts: readonly string[],
  maxChars: number,
): { text: string; kept: number; truncated: boolean } | null {
  const intro =
    "Facts from the pre-compaction transcript the summary above omitted:";
  let text = `${RECOVERED_CONTEXT_HEADER}\n${intro}`;
  let kept = 0;
  for (const fact of facts) {
    const withFact = `${text}\n- ${fact}`;
    if (withFact.length > maxChars) break;
    text = withFact;
    kept += 1;
  }
  if (kept === 0) return null;
  return { text, kept, truncated: kept < facts.length };
}

/** Joined text of a prompt's user messages — the transcript the judge audits against. */
function extractTranscript(prompt: GatewayPrompt): string {
  const chunks: string[] = [];
  for (const message of prompt) {
    if (message.role !== "user") continue;
    for (const part of message.content) {
      if (part.type === "text" && part.text !== "") chunks.push(part.text);
    }
  }
  return chunks.join("\n\n");
}

function isTextContent(
  part: GatewayContent,
): part is Extract<GatewayContent, { type: "text" }> {
  return part.type === "text";
}

/** Joined text content of a generate result. */
function extractText(content: readonly GatewayContent[]): string {
  return content
    .filter(isTextContent)
    .map((part) => part.text)
    .join("");
}

/**
 * Wrap a model so eve's compaction summaries are judged against the transcript
 * they replace, and repaired in place when the judge finds dropped facts.
 *
 * Behavior per intercepted compaction call: run the base summary generation
 * unchanged, then ask the same model (one extra `doGenerate`, temperature 0)
 * whether the summary dropped load-bearing facts, and append the missing ones
 * as a {@link RECOVERED_CONTEXT_HEADER} section. Fail-open throughout: judge
 * errors/timeouts and observer exceptions never fail the compaction, and base
 * summary errors propagate untouched. `doStream` (turn traffic) is a pure
 * delegate, and the facade mirrors `provider`/`modelId` so provider-string
 * gates (eve's Anthropic prompt-cache path detection) keep working.
 */
export function withValidatedCompaction(
  model: GatewayLanguageModel,
  options: ValidatedCompactionOptions = {},
): GatewayLanguageModel {
  const maxRecoveredChars =
    options.maxRecoveredChars ?? DEFAULT_MAX_RECOVERED_CHARS;
  const maxRecoveredFacts =
    options.maxRecoveredFacts ?? DEFAULT_MAX_RECOVERED_FACTS;
  const judgeMaxOutputTokens =
    options.judgeMaxOutputTokens ?? DEFAULT_JUDGE_MAX_OUTPUT_TOKENS;
  const judgeTimeoutMs = options.judgeTimeoutMs ?? DEFAULT_JUDGE_TIMEOUT_MS;
  const judgeSystemPrompt =
    options.validationSystemPrompt ??
    buildValidationSystemPrompt(maxRecoveredFacts);

  const emit = (report: CompactionValidationReport): void => {
    try {
      options.onValidation?.(report);
    } catch {
      // Observability must not fail the compaction.
    }
  };

  const validate = async (
    params: GatewayCallOptions,
    result: GatewayGenerateResult,
  ): Promise<GatewayGenerateResult> => {
    const transcript = extractTranscript(params.prompt);
    if (transcript === "") {
      emit({ kind: "skipped", reason: "no-transcript" });
      return result;
    }
    const candidate = extractText(result.content);
    if (candidate.trim() === "") {
      emit({ kind: "skipped", reason: "no-summary-text" });
      return result;
    }

    let judgeText: string;
    try {
      const signals = [AbortSignal.timeout(judgeTimeoutMs)];
      if (params.abortSignal) signals.push(params.abortSignal);
      const judgeResult = await model.doGenerate({
        prompt: [
          { role: "system", content: judgeSystemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Original conversation transcript:\n<transcript>\n${transcript}\n</transcript>\n\nCandidate summary:\n<summary>\n${candidate}\n</summary>`,
              },
            ],
          },
        ],
        temperature: 0,
        maxOutputTokens: judgeMaxOutputTokens,
        abortSignal: AbortSignal.any(signals),
        ...(params.headers !== undefined && { headers: params.headers }),
        ...(params.providerOptions !== undefined && {
          providerOptions: params.providerOptions,
        }),
      });
      judgeText = extractText(judgeResult.content);
    } catch (error) {
      emit({ kind: "judge-error", error });
      return result;
    }

    const verdict = parseJudgeVerdict(judgeText);
    if (verdict.kind === "nothing-missing") {
      emit({ kind: "nothing-missing", judgeText });
      return result;
    }

    const capped = verdict.facts.slice(0, maxRecoveredFacts);
    const cappedByCount = capped.length < verdict.facts.length;
    const section = buildRecoverySection(capped, maxRecoveredChars);
    if (section === null) {
      emit({ kind: "nothing-missing", judgeText });
      return result;
    }

    const lastTextIndex = result.content.findLastIndex(isTextContent);
    const lastText = result.content[lastTextIndex];
    if (lastText === undefined || !isTextContent(lastText)) {
      // Unreachable: candidate was non-empty, so a text part exists.
      emit({ kind: "skipped", reason: "no-summary-text" });
      return result;
    }
    const appended = `\n\n${section.text}`;
    const content = result.content.map((part, index) =>
      index === lastTextIndex && isTextContent(part)
        ? { ...part, text: part.text + appended }
        : part,
    );
    emit({
      kind: "repaired",
      facts: capped.slice(0, section.kept),
      truncated: section.truncated || cappedByCount,
      appendedChars: appended.length,
    });
    return { ...result, content };
  };

  return {
    specificationVersion: "v4",
    provider: model.provider,
    modelId: model.modelId,
    get supportedUrls() {
      return model.supportedUrls;
    },
    async doGenerate(params) {
      const first = params.prompt[0];
      const isCompaction =
        first !== undefined &&
        first.role === "system" &&
        first.content.startsWith(COMPACTION_SENTINEL);
      if (!isCompaction) return model.doGenerate(params);
      const result = await model.doGenerate(params);
      return validate(params, result);
    },
    doStream(params) {
      return model.doStream(params);
    },
  };
}

/**
 * Lift {@link withValidatedCompaction} onto a gateway provider: every language
 * model it mints (`languageModel`, `chat`, or the callable form — `ai`'s
 * `resolveLanguageModel` goes through `languageModel` when it resolves a bare
 * string slug against the default-provider slot) comes back wrapped, and every
 * other member (embedding/image/speech models, `tools`, the metadata calls)
 * delegates untouched. A Proxy rather than a copied object so accessor
 * properties and future gateway members keep delegating.
 */
export function withValidatedCompactionProvider(
  provider: GatewayProvider,
  options: ValidatedCompactionOptions = {},
): GatewayProvider {
  const wrap = (model: GatewayLanguageModel): GatewayLanguageModel =>
    withValidatedCompaction(model, options);
  return new Proxy(provider, {
    apply(target, _thisArg, args: Parameters<GatewayProvider>) {
      return wrap(target(...args));
    },
    get(target, property, receiver): unknown {
      if (property === "languageModel" || property === "chat") {
        const mint = target[property].bind(target);
        return (modelId: Parameters<GatewayProvider["languageModel"]>[0]) =>
          wrap(mint(modelId));
      }
      return Reflect.get(target, property, receiver);
    },
  });
}
