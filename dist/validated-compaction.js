// ../../../../../tmp/agent-sdk-mirror-amKYLe/repo/platform/runtime-ai/validated-compaction.ts
var COMPACTION_SENTINEL = "You are a conversation summarizer.";
var RECOVERED_CONTEXT_HEADER = "## Recovered context (compaction audit)";
var DEFAULT_MAX_RECOVERED_CHARS = 2000;
var DEFAULT_MAX_RECOVERED_FACTS = 12;
var DEFAULT_JUDGE_MAX_OUTPUT_TOKENS = 1024;
var DEFAULT_JUDGE_TIMEOUT_MS = 60000;
function buildValidationSystemPrompt(maxFacts) {
  return [
    "You audit conversation summaries for information loss.",
    "You will receive the original conversation transcript and a candidate summary of it.",
    "Identify concrete, load-bearing facts present in the transcript but missing from the summary:",
    "task goals and their status, files or paths modified, decisions and their reasons, constraints,",
    "open questions, pending verification steps, exact identifiers (names, commands, versions, URLs).",
    "Reply with exactly `NOTHING MISSING` if the summary preserves everything needed.",
    "Otherwise reply with one missing fact per line, each line starting with `- `,",
    `most important first, at most ${maxFacts} lines, no other text.`
  ].join(" ");
}
function parseJudgeVerdict(text) {
  if (/^nothing missing[.!]?$/i.test(text.trim())) {
    return { kind: "nothing-missing" };
  }
  const facts = [];
  for (const line of text.split(`
`)) {
    const match = /^\s*[-*]\s+(.+)$/.exec(line);
    const fact = match?.[1]?.trim();
    if (fact !== undefined && fact !== "")
      facts.push(fact);
  }
  if (facts.length === 0)
    return { kind: "nothing-missing" };
  return { kind: "missing", facts };
}
function buildRecoverySection(facts, maxChars) {
  const intro = "Facts from the pre-compaction transcript the summary above omitted:";
  let text = `${RECOVERED_CONTEXT_HEADER}
${intro}`;
  let kept = 0;
  for (const fact of facts) {
    const withFact = `${text}
- ${fact}`;
    if (withFact.length > maxChars)
      break;
    text = withFact;
    kept += 1;
  }
  if (kept === 0)
    return null;
  return { text, kept, truncated: kept < facts.length };
}
function extractTranscript(prompt) {
  const chunks = [];
  for (const message of prompt) {
    if (message.role !== "user")
      continue;
    for (const part of message.content) {
      if (part.type === "text" && part.text !== "")
        chunks.push(part.text);
    }
  }
  return chunks.join(`

`);
}
function isTextContent(part) {
  return part.type === "text";
}
function extractText(content) {
  return content.filter(isTextContent).map((part) => part.text).join("");
}
function withValidatedCompaction(model, options = {}) {
  const maxRecoveredChars = options.maxRecoveredChars ?? DEFAULT_MAX_RECOVERED_CHARS;
  const maxRecoveredFacts = options.maxRecoveredFacts ?? DEFAULT_MAX_RECOVERED_FACTS;
  const judgeMaxOutputTokens = options.judgeMaxOutputTokens ?? DEFAULT_JUDGE_MAX_OUTPUT_TOKENS;
  const judgeTimeoutMs = options.judgeTimeoutMs ?? DEFAULT_JUDGE_TIMEOUT_MS;
  const judgeSystemPrompt = options.validationSystemPrompt ?? buildValidationSystemPrompt(maxRecoveredFacts);
  const emit = (report) => {
    try {
      options.onValidation?.(report);
    } catch {}
  };
  const validate = async (params, result) => {
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
    let judgeText;
    try {
      const signals = [AbortSignal.timeout(judgeTimeoutMs)];
      if (params.abortSignal)
        signals.push(params.abortSignal);
      const judgeResult = await model.doGenerate({
        prompt: [
          { role: "system", content: judgeSystemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Original conversation transcript:
<transcript>
${transcript}
</transcript>

Candidate summary:
<summary>
${candidate}
</summary>`
              }
            ]
          }
        ],
        temperature: 0,
        maxOutputTokens: judgeMaxOutputTokens,
        abortSignal: AbortSignal.any(signals),
        ...params.headers !== undefined && { headers: params.headers },
        ...params.providerOptions !== undefined && {
          providerOptions: params.providerOptions
        }
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
      emit({ kind: "skipped", reason: "no-summary-text" });
      return result;
    }
    const appended = `

${section.text}`;
    const content = result.content.map((part, index) => index === lastTextIndex && isTextContent(part) ? { ...part, text: part.text + appended } : part);
    emit({
      kind: "repaired",
      facts: capped.slice(0, section.kept),
      truncated: section.truncated || cappedByCount,
      appendedChars: appended.length
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
      const isCompaction = first !== undefined && first.role === "system" && first.content.startsWith(COMPACTION_SENTINEL);
      if (!isCompaction)
        return model.doGenerate(params);
      const result = await model.doGenerate(params);
      return validate(params, result);
    },
    doStream(params) {
      return model.doStream(params);
    }
  };
}
function withValidatedCompactionProvider(provider, options = {}) {
  const wrap = (model) => withValidatedCompaction(model, options);
  return new Proxy(provider, {
    apply(target, _thisArg, args) {
      return wrap(target(...args));
    },
    get(target, property, receiver) {
      if (property === "languageModel" || property === "chat") {
        const mint = target[property].bind(target);
        return (modelId) => wrap(mint(modelId));
      }
      return Reflect.get(target, property, receiver);
    }
  });
}
export {
  withValidatedCompactionProvider,
  withValidatedCompaction,
  parseJudgeVerdict,
  buildValidationSystemPrompt,
  buildRecoverySection,
  RECOVERED_CONTEXT_HEADER,
  DEFAULT_MAX_RECOVERED_FACTS,
  DEFAULT_MAX_RECOVERED_CHARS,
  DEFAULT_JUDGE_TIMEOUT_MS,
  DEFAULT_JUDGE_MAX_OUTPUT_TOKENS,
  COMPACTION_SENTINEL
};
