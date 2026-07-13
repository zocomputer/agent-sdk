import { describe, expect, test } from "bun:test";
import { zoGateway } from "./gateway";
import * as local from "./validated-compaction";

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

describe("validated compaction behavior", () => {
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
      expect(ours.result.content).toBeDefined();
    });
  }

  test("non-compaction doGenerate passes through with no report", async () => {
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
    expect(ours.result.content).toBeDefined();
    expect(ours.reports).toEqual([]);
    expect(ours.calls.length).toBe(1);
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
