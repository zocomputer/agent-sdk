/**
 * Drift pin: this package's vendored validated-compaction copy stays in
 * lockstep with `@zocomputer/agent-sdk/validated-compaction` (the canonical
 * implementation, which also carries the eve-sentinel pin test). The module is
 * duplicated because the vendored agent copy resolves only `ai` + Node
 * built-ins; this suite fails loudly when the two copies diverge — constants,
 * prompt, or behavior. Change them together.
 */
import { describe, expect, test } from "bun:test";
import * as sdk from "@zocomputer/agent-sdk/validated-compaction";
import { zoGateway } from "./gateway";
import * as local from "./validated-compaction";

describe("constants match agent-sdk", () => {
  test("sentinel, header, and defaults are equal", () => {
    expect(local.COMPACTION_SENTINEL).toBe(sdk.COMPACTION_SENTINEL);
    expect(local.RECOVERED_CONTEXT_HEADER).toBe(sdk.RECOVERED_CONTEXT_HEADER);
    expect(local.DEFAULT_MAX_RECOVERED_CHARS).toBe(
      sdk.DEFAULT_MAX_RECOVERED_CHARS,
    );
    expect(local.DEFAULT_MAX_RECOVERED_FACTS).toBe(
      sdk.DEFAULT_MAX_RECOVERED_FACTS,
    );
    expect(local.DEFAULT_JUDGE_MAX_OUTPUT_TOKENS).toBe(
      sdk.DEFAULT_JUDGE_MAX_OUTPUT_TOKENS,
    );
    expect(local.DEFAULT_JUDGE_TIMEOUT_MS).toBe(sdk.DEFAULT_JUDGE_TIMEOUT_MS);
  });

  test("the judge system prompt is identical", () => {
    for (const maxFacts of [1, 5, 12, 40]) {
      expect(local.buildValidationSystemPrompt(maxFacts)).toBe(
        sdk.buildValidationSystemPrompt(maxFacts),
      );
    }
  });

  test("verdict parsing and section rendering agree on shared samples", () => {
    const replies = [
      "NOTHING MISSING",
      "nothing missing.",
      "- fact one\n- fact two",
      "* starred\nprose line\n-  padded fact  ",
      "no bullets at all",
      "",
    ];
    for (const reply of replies) {
      expect(local.parseJudgeVerdict(reply)).toEqual(
        sdk.parseJudgeVerdict(reply),
      );
    }
    const facts = ["alpha", "a much longer fact about scripts/mint-token.ts"];
    for (const maxChars of [0, 10, 90, 2000]) {
      expect(local.buildRecoverySection(facts, maxChars)).toEqual(
        sdk.buildRecoverySection(facts, maxChars),
      );
    }
  });
});

/** A model both facades accept — the shapes are structurally identical. */
type LocalModel = Parameters<typeof local.withValidatedCompaction>[0];
type CallOptions = Parameters<LocalModel["doGenerate"]>[0];
type GenerateResult = Awaited<ReturnType<LocalModel["doGenerate"]>>;

function scriptedModel(replies: readonly (string | Error)[]): {
  model: LocalModel;
  calls: CallOptions[];
} {
  const queue = [...replies];
  const calls: CallOptions[] = [];
  const model: LocalModel = {
    specificationVersion: "v4",
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    supportedUrls: {},
    doGenerate(options): Promise<GenerateResult> {
      calls.push(options);
      const reply = queue.shift();
      if (reply === undefined) throw new Error("scripted model exhausted");
      if (reply instanceof Error) return Promise.reject(reply);
      return Promise.resolve({
        content: [{ type: "text", text: reply }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 5, text: 5, reasoning: 0 },
        },
        warnings: [],
      });
    },
    doStream() {
      throw new Error("not used in this suite");
    },
  };
  return { model, calls };
}

function compactionCall(): CallOptions {
  return {
    prompt: [
      { role: "system", content: `${local.COMPACTION_SENTINEL} Summarize.` },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Conversation transcript:\nuser: wire the deploy token via scripts/mint-token.ts",
          },
        ],
      },
    ],
    temperature: 0,
  };
}

/** Run one scripted scenario through a facade; returns the result + reports. */
async function runScenario(
  wrap: (
    model: LocalModel,
    options: { onValidation: (report: unknown) => void },
  ) => LocalModel,
  replies: readonly (string | Error)[],
  params: CallOptions,
): Promise<{ result: GenerateResult; reports: unknown[]; calls: CallOptions[] }> {
  const { model, calls } = scriptedModel(replies);
  const reports: unknown[] = [];
  const wrapped = wrap(model, {
    onValidation: (report) => reports.push(report),
  });
  const result = await wrapped.doGenerate(params);
  return { result, reports, calls };
}

describe("behavior matches agent-sdk", () => {
  const scenarios: { name: string; replies: (string | Error)[] }[] = [
    {
      name: "repair: judge reports dropped facts",
      replies: [
        "Goal: ship the feature.",
        "- The deploy token is minted by scripts/mint-token.ts",
      ],
    },
    { name: "nothing missing", replies: ["Goal: ship.", "NOTHING MISSING"] },
    {
      name: "judge error fails open",
      replies: ["Goal: ship.", new Error("judge down")],
    },
  ];

  for (const scenario of scenarios) {
    test(scenario.name, async () => {
      const ours = await runScenario(
        (model, options) => local.withValidatedCompaction(model, options),
        scenario.replies,
        compactionCall(),
      );
      const theirs = await runScenario(
        (model, options) => sdk.withValidatedCompaction(model, options),
        scenario.replies,
        compactionCall(),
      );
      expect(ours.result.content).toEqual(theirs.result.content);
      expect(ours.reports).toEqual(theirs.reports);
      // Judge-call prompts (when a judge call happened) are byte-identical.
      expect(ours.calls.length).toBe(theirs.calls.length);
      const ourJudge = ours.calls[1];
      const theirJudge = theirs.calls[1];
      expect(ourJudge?.prompt).toEqual(theirJudge?.prompt);
      expect(ourJudge?.maxOutputTokens).toBe(theirJudge?.maxOutputTokens);
    });
  }

  test("non-compaction doGenerate passes through in both, with no report", async () => {
    const params: CallOptions = {
      prompt: [
        { role: "system", content: "You are a coding agent." },
        { role: "user", content: [{ type: "text", text: "hi" }] },
      ],
    };
    const ours = await runScenario(
      (model, options) => local.withValidatedCompaction(model, options),
      ["hello"],
      params,
    );
    const theirs = await runScenario(
      (model, options) => sdk.withValidatedCompaction(model, options),
      ["hello"],
      params,
    );
    expect(ours.result.content).toEqual(theirs.result.content);
    expect(ours.reports).toEqual([]);
    expect(theirs.reports).toEqual([]);
    expect(ours.calls.length).toBe(1);
    expect(theirs.calls.length).toBe(1);
  });
});

describe("withValidatedCompactionProvider", () => {
  const base = zoGateway();
  const wrapped = local.withValidatedCompactionProvider(base);

  test("languageModel, chat, and the callable form mint wrapped models", () => {
    const slug = "anthropic/claude-sonnet-4-6";
    const baseModel = base.languageModel(slug);
    for (const model of [
      wrapped.languageModel(slug),
      wrapped.chat(slug),
      wrapped(slug),
    ]) {
      // A facade, not the gateway's own instance — but mirroring its identity
      // fields (eve's provider-string gates read these).
      expect(model).not.toBe(baseModel);
      expect(model.provider).toBe(baseModel.provider);
      expect(model.modelId).toBe(baseModel.modelId);
      expect(model.specificationVersion).toBe("v4");
    }
  });

  test("everything else delegates to the base provider untouched", () => {
    expect(wrapped.specificationVersion).toBe(base.specificationVersion);
    // Function-identity comparisons, deliberately unbound: the pin is that the
    // Proxy hands back the base provider's own members, not copies.
    /* eslint-disable @typescript-eslint/unbound-method */
    expect(wrapped.getAvailableModels).toBe(base.getAvailableModels);
    expect(wrapped.embeddingModel).toBe(base.embeddingModel);
    expect(wrapped.imageModel).toBe(base.imageModel);
    /* eslint-enable @typescript-eslint/unbound-method */
    expect(wrapped.tools).toBe(base.tools);
  });
});
