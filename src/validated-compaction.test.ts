import { describe, expect, test } from "bun:test";
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4GenerateResult,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4Usage,
} from "@ai-sdk/provider";
import {
  COMPACTION_SENTINEL,
  DEFAULT_JUDGE_MAX_OUTPUT_TOKENS,
  DEFAULT_MAX_RECOVERED_FACTS,
  RECOVERED_CONTEXT_HEADER,
  buildRecoverySection,
  buildValidationSystemPrompt,
  parseJudgeVerdict,
  withValidatedCompaction,
  type CompactionValidationReport,
} from "./validated-compaction";

const usage = (): LanguageModelV4Usage => ({
  inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 10, text: 10, reasoning: 0 },
});

const textResult = (
  content: LanguageModelV4Content[],
): LanguageModelV4GenerateResult => ({
  content,
  finishReason: { unified: "stop", raw: "stop" },
  usage: usage(),
  warnings: [],
});

type ScriptedResponse =
  | { kind: "text"; text: string }
  | { kind: "content"; content: LanguageModelV4Content[] }
  | { kind: "error"; error: unknown }
  | { kind: "hang" };

/** A LanguageModelV4 that replays scripted doGenerate responses and records calls. */
function createScriptedModel(responses: ScriptedResponse[]): {
  model: LanguageModelV4;
  calls: LanguageModelV4CallOptions[];
  streamCalls: LanguageModelV4CallOptions[];
} {
  const queue = [...responses];
  const calls: LanguageModelV4CallOptions[] = [];
  const streamCalls: LanguageModelV4CallOptions[] = [];
  const model: LanguageModelV4 = {
    specificationVersion: "v4",
    provider: "scripted",
    modelId: "scripted-model",
    supportedUrls: {},
    doGenerate(options) {
      calls.push(options);
      const next = queue.shift();
      if (next === undefined) throw new Error("scripted model exhausted");
      if (next.kind === "error") return Promise.reject(next.error);
      if (options.abortSignal?.aborted) {
        return Promise.reject(options.abortSignal.reason ?? new Error("aborted"));
      }
      if (next.kind === "hang") {
        return new Promise((_resolve, reject) => {
          options.abortSignal?.addEventListener("abort", () => {
            reject(options.abortSignal?.reason ?? new Error("aborted"));
          });
        });
      }
      const content: LanguageModelV4Content[] =
        next.kind === "text" ? [{ type: "text", text: next.text }] : next.content;
      return Promise.resolve(textResult(content));
    },
    doStream(options) {
      streamCalls.push(options);
      return Promise.resolve({
        stream: new ReadableStream<LanguageModelV4StreamPart>(),
      });
    },
  };
  return { model, calls, streamCalls };
}

const compactionPrompt = (transcript: string): LanguageModelV4Prompt => [
  { role: "system", content: `${COMPACTION_SENTINEL} Write a concise summary.` },
  { role: "user", content: [{ type: "text", text: transcript }] },
];

const generateOptions = (
  prompt: LanguageModelV4Prompt,
): LanguageModelV4CallOptions => ({ prompt });

/** The text of a result's single expected text part. */
function resultText(result: LanguageModelV4GenerateResult): string {
  return result.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

describe("parseJudgeVerdict", () => {
  test("NOTHING MISSING is nothing-missing, case-insensitive with punctuation", () => {
    expect(parseJudgeVerdict("NOTHING MISSING")).toEqual({
      kind: "nothing-missing",
    });
    expect(parseJudgeVerdict("nothing missing.")).toEqual({
      kind: "nothing-missing",
    });
    expect(parseJudgeVerdict("  Nothing Missing!  ")).toEqual({
      kind: "nothing-missing",
    });
  });

  test("bullet lines become facts in order, - and * both accepted", () => {
    expect(parseJudgeVerdict("- first fact\n* second fact")).toEqual({
      kind: "missing",
      facts: ["first fact", "second fact"],
    });
  });

  test("only bullet lines count; surrounding prose is ignored", () => {
    const verdict = parseJudgeVerdict(
      "Here is what I found:\n- the modified file list\nHope that helps.",
    );
    expect(verdict).toEqual({ kind: "missing", facts: ["the modified file list"] });
  });

  test("empty, whitespace, and bullet-free prose are nothing-missing", () => {
    expect(parseJudgeVerdict("")).toEqual({ kind: "nothing-missing" });
    expect(parseJudgeVerdict("   \n  ")).toEqual({ kind: "nothing-missing" });
    expect(parseJudgeVerdict("The summary looks complete to me.")).toEqual({
      kind: "nothing-missing",
    });
  });

  test("a bullet with only whitespace after the dash is not a fact", () => {
    expect(parseJudgeVerdict("-    ")).toEqual({ kind: "nothing-missing" });
  });
});

describe("buildValidationSystemPrompt", () => {
  test("carries the fact cap and the reply contract", () => {
    const prompt = buildValidationSystemPrompt(7);
    expect(prompt).toContain("at most 7 lines");
    expect(prompt).toContain("NOTHING MISSING");
  });
});

describe("buildRecoverySection", () => {
  test("renders header, intro, and one bullet per fact", () => {
    const section = buildRecoverySection(["fact one", "fact two"], 10_000);
    expect(section).not.toBeNull();
    expect(section?.text).toContain(RECOVERED_CONTEXT_HEADER);
    expect(section?.text).toContain("\n- fact one\n- fact two");
    expect(section?.kept).toBe(2);
    expect(section?.truncated).toBe(false);
  });

  test("drops whole bullets past the cap and marks truncated", () => {
    const base = buildRecoverySection(["aa"], 10_000);
    if (base === null) throw new Error("expected a section");
    const cap = base.text.length + 3; // room for the first bullet, not a second
    const section = buildRecoverySection(["aa", "bb"], cap);
    expect(section?.kept).toBe(1);
    expect(section?.truncated).toBe(true);
    expect(section?.text).toContain("- aa");
    expect(section?.text).not.toContain("- bb");
    expect(section !== null && section.text.length <= cap).toBe(true);
  });

  test("returns null when not even the first bullet fits, or facts is empty", () => {
    expect(buildRecoverySection(["a fact"], 10)).toBeNull();
    expect(buildRecoverySection([], 10_000)).toBeNull();
  });
});

describe("withValidatedCompaction", () => {
  test("mirrors provider, modelId, and supportedUrls", () => {
    const { model } = createScriptedModel([]);
    const wrapped = withValidatedCompaction(model);
    expect(wrapped.specificationVersion).toBe("v4");
    expect(wrapped.provider).toBe("scripted");
    expect(wrapped.modelId).toBe("scripted-model");
    expect(wrapped.supportedUrls).toBe(model.supportedUrls);
  });

  test("non-compaction doGenerate passes through with no judge call, no report", async () => {
    const { model, calls } = createScriptedModel([{ kind: "text", text: "hi" }]);
    const reports: CompactionValidationReport[] = [];
    const wrapped = withValidatedCompaction(model, {
      onValidation: (report) => reports.push(report),
    });
    const result = await wrapped.doGenerate(
      generateOptions([
        { role: "system", content: "You are a coding agent." },
        { role: "user", content: [{ type: "text", text: "hello" }] },
      ]),
    );
    expect(resultText(result)).toBe("hi");
    expect(calls.length).toBe(1);
    expect(reports).toEqual([]);
  });

  test("doStream is a pure delegate", async () => {
    const { model, calls, streamCalls } = createScriptedModel([]);
    const wrapped = withValidatedCompaction(model);
    const options = generateOptions(compactionPrompt("transcript"));
    await wrapped.doStream(options);
    expect(streamCalls).toEqual([options]);
    expect(calls.length).toBe(0);
  });

  test("judge says NOTHING MISSING: summary unchanged, report carries judgeText", async () => {
    const { model, calls } = createScriptedModel([
      { kind: "text", text: "the summary" },
      { kind: "text", text: "NOTHING MISSING" },
    ]);
    const reports: CompactionValidationReport[] = [];
    const wrapped = withValidatedCompaction(model, {
      onValidation: (report) => reports.push(report),
    });
    const result = await wrapped.doGenerate(
      generateOptions(compactionPrompt("user did things")),
    );
    expect(resultText(result)).toBe("the summary");
    expect(calls.length).toBe(2);
    expect(reports).toEqual([
      { kind: "nothing-missing", judgeText: "NOTHING MISSING" },
    ]);
  });

  test("judge reports facts: they are appended as a recovery section", async () => {
    const { model, calls } = createScriptedModel([
      { kind: "text", text: "the summary" },
      { kind: "text", text: "- dropped fact one\n- dropped fact two" },
    ]);
    const reports: CompactionValidationReport[] = [];
    const wrapped = withValidatedCompaction(model, {
      onValidation: (report) => reports.push(report),
    });
    const result = await wrapped.doGenerate(
      generateOptions(compactionPrompt("user did things")),
    );
    const text = resultText(result);
    expect(text.startsWith("the summary\n\n")).toBe(true);
    expect(text).toContain(RECOVERED_CONTEXT_HEADER);
    expect(text).toContain("- dropped fact one");
    expect(text).toContain("- dropped fact two");
    expect(result.finishReason).toEqual({ unified: "stop", raw: "stop" });
    expect(result.usage).toEqual(usage());
    const report = reports[0];
    if (report?.kind !== "repaired") throw new Error("expected a repaired report");
    expect(report.facts).toEqual(["dropped fact one", "dropped fact two"]);
    expect(report.truncated).toBe(false);
    expect(report.appendedChars).toBe(text.length - "the summary".length);

    // Judge call shape: same-model doGenerate at temperature 0 with the default prompt.
    const judgeCall = calls[1];
    expect(judgeCall?.prompt[0]).toEqual({
      role: "system",
      content: buildValidationSystemPrompt(DEFAULT_MAX_RECOVERED_FACTS),
    });
    expect(judgeCall?.temperature).toBe(0);
    expect(judgeCall?.maxOutputTokens).toBe(DEFAULT_JUDGE_MAX_OUTPUT_TOKENS);
    const judgeUser = judgeCall?.prompt[1];
    if (judgeUser?.role !== "user") throw new Error("expected a judge user message");
    const judgeUserText = judgeUser.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
    expect(judgeUserText).toContain("user did things");
    expect(judgeUserText).toContain("the summary");
  });

  test("appends only to the last text part; other content is untouched", async () => {
    const reasoning: LanguageModelV4Content = {
      type: "reasoning",
      text: "thinking",
    };
    const { model } = createScriptedModel([
      {
        kind: "content",
        content: [
          reasoning,
          { type: "text", text: "part one. " },
          { type: "text", text: "part two." },
        ],
      },
      { kind: "text", text: "- a fact" },
    ]);
    const wrapped = withValidatedCompaction(model);
    const result = await wrapped.doGenerate(
      generateOptions(compactionPrompt("transcript")),
    );
    expect(result.content[0]).toEqual(reasoning);
    expect(result.content[1]).toEqual({ type: "text", text: "part one. " });
    const last = result.content[2];
    if (last?.type !== "text") throw new Error("expected a text part");
    expect(last.text.startsWith("part two.\n\n")).toBe(true);
    expect(last.text).toContain(RECOVERED_CONTEXT_HEADER);
  });

  test("custom validationSystemPrompt replaces the default judge prompt", async () => {
    const { model, calls } = createScriptedModel([
      { kind: "text", text: "summary" },
      { kind: "text", text: "NOTHING MISSING" },
    ]);
    const wrapped = withValidatedCompaction(model, {
      validationSystemPrompt: "Audit hard. Reply NOTHING MISSING or bullets.",
    });
    await wrapped.doGenerate(generateOptions(compactionPrompt("transcript")));
    expect(calls[1]?.prompt[0]).toEqual({
      role: "system",
      content: "Audit hard. Reply NOTHING MISSING or bullets.",
    });
  });

  test("maxRecoveredFacts caps the appended facts and marks truncated", async () => {
    const { model } = createScriptedModel([
      { kind: "text", text: "summary" },
      { kind: "text", text: "- one\n- two\n- three" },
    ]);
    const reports: CompactionValidationReport[] = [];
    const wrapped = withValidatedCompaction(model, {
      maxRecoveredFacts: 2,
      onValidation: (report) => reports.push(report),
    });
    const result = await wrapped.doGenerate(
      generateOptions(compactionPrompt("transcript")),
    );
    const report = reports[0];
    if (report?.kind !== "repaired") throw new Error("expected a repaired report");
    expect(report.facts).toEqual(["one", "two"]);
    expect(report.truncated).toBe(true);
    expect(resultText(result)).not.toContain("- three");
  });

  test("a cap too small for any bullet fails open as nothing-missing", async () => {
    const { model } = createScriptedModel([
      { kind: "text", text: "summary" },
      { kind: "text", text: "- an important dropped fact" },
    ]);
    const reports: CompactionValidationReport[] = [];
    const wrapped = withValidatedCompaction(model, {
      maxRecoveredChars: 10,
      onValidation: (report) => reports.push(report),
    });
    const result = await wrapped.doGenerate(
      generateOptions(compactionPrompt("transcript")),
    );
    expect(resultText(result)).toBe("summary");
    expect(reports[0]?.kind).toBe("nothing-missing");
  });

  test("judge error fails open: summary unchanged, judge-error report", async () => {
    const boom = new Error("gateway down");
    const { model } = createScriptedModel([
      { kind: "text", text: "summary" },
      { kind: "error", error: boom },
    ]);
    const reports: CompactionValidationReport[] = [];
    const wrapped = withValidatedCompaction(model, {
      onValidation: (report) => reports.push(report),
    });
    const result = await wrapped.doGenerate(
      generateOptions(compactionPrompt("transcript")),
    );
    expect(resultText(result)).toBe("summary");
    expect(reports).toEqual([{ kind: "judge-error", error: boom }]);
  });

  test("judge timeout fails open via judgeTimeoutMs", async () => {
    const { model } = createScriptedModel([
      { kind: "text", text: "summary" },
      { kind: "hang" },
    ]);
    const reports: CompactionValidationReport[] = [];
    const wrapped = withValidatedCompaction(model, {
      judgeTimeoutMs: 5,
      onValidation: (report) => reports.push(report),
    });
    const result = await wrapped.doGenerate(
      generateOptions(compactionPrompt("transcript")),
    );
    expect(resultText(result)).toBe("summary");
    expect(reports[0]?.kind).toBe("judge-error");
  });

  test("caller abort reaches the judge call", async () => {
    const { model } = createScriptedModel([
      { kind: "text", text: "summary" },
      { kind: "hang" },
    ]);
    const reports: CompactionValidationReport[] = [];
    const wrapped = withValidatedCompaction(model, {
      onValidation: (report) => reports.push(report),
    });
    const controller = new AbortController();
    const options: LanguageModelV4CallOptions = {
      prompt: compactionPrompt("transcript"),
      abortSignal: controller.signal,
    };
    const pending = wrapped.doGenerate(options);
    setTimeout(() => controller.abort(new Error("caller cancelled")), 1);
    const result = await pending;
    expect(resultText(result)).toBe("summary");
    expect(reports[0]?.kind).toBe("judge-error");
  });

  test("skips when the compaction prompt has no user transcript", async () => {
    const { model, calls } = createScriptedModel([
      { kind: "text", text: "summary" },
    ]);
    const reports: CompactionValidationReport[] = [];
    const wrapped = withValidatedCompaction(model, {
      onValidation: (report) => reports.push(report),
    });
    await wrapped.doGenerate(
      generateOptions([
        { role: "system", content: `${COMPACTION_SENTINEL} Summarize.` },
      ]),
    );
    expect(calls.length).toBe(1);
    expect(reports).toEqual([{ kind: "skipped", reason: "no-transcript" }]);
  });

  test("skips when the base result has no summary text", async () => {
    const { model, calls } = createScriptedModel([
      { kind: "content", content: [{ type: "reasoning", text: "hmm" }] },
    ]);
    const reports: CompactionValidationReport[] = [];
    const wrapped = withValidatedCompaction(model, {
      onValidation: (report) => reports.push(report),
    });
    await wrapped.doGenerate(generateOptions(compactionPrompt("transcript")));
    expect(calls.length).toBe(1);
    expect(reports).toEqual([{ kind: "skipped", reason: "no-summary-text" }]);
  });

  test("a throwing onValidation observer never fails the compaction", async () => {
    const { model } = createScriptedModel([
      { kind: "text", text: "summary" },
      { kind: "text", text: "- a fact" },
    ]);
    const wrapped = withValidatedCompaction(model, {
      onValidation: () => {
        throw new Error("observer bug");
      },
    });
    const result = await wrapped.doGenerate(
      generateOptions(compactionPrompt("transcript")),
    );
    expect(resultText(result)).toContain(RECOVERED_CONTEXT_HEADER);
  });

  test("forwards headers and providerOptions to the judge call", async () => {
    const { model, calls } = createScriptedModel([
      { kind: "text", text: "summary" },
      { kind: "text", text: "NOTHING MISSING" },
    ]);
    const wrapped = withValidatedCompaction(model);
    await wrapped.doGenerate({
      prompt: compactionPrompt("transcript"),
      headers: { "x-zo-metering": "agent-1" },
      providerOptions: { gateway: { caching: "auto" } },
    });
    expect(calls[1]?.headers).toEqual({ "x-zo-metering": "agent-1" });
    expect(calls[1]?.providerOptions).toEqual({ gateway: { caching: "auto" } });
  });

  test("base summary errors propagate untouched", async () => {
    const boom = new Error("summary generation failed");
    const { model } = createScriptedModel([{ kind: "error", error: boom }]);
    const reports: CompactionValidationReport[] = [];
    const wrapped = withValidatedCompaction(model, {
      onValidation: (report) => reports.push(report),
    });
    expect(
      wrapped.doGenerate(generateOptions(compactionPrompt("transcript"))),
    ).rejects.toBe(boom);
    expect(reports).toEqual([]);
  });
});
