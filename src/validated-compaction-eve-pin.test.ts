/**
 * Pin test: eve's real compaction call trips the facade's sentinel.
 *
 * `withValidatedCompaction` recognizes a compaction call by
 * {@link COMPACTION_SENTINEL} — the first sentence of eve's
 * `COMPACTION_SYSTEM_PROMPT`. That prompt lives in eve's dist (assembled from
 * fragments, so no source string to grep), so this test loads the installed
 * eve's `compactMessages` by path and drives it end-to-end through the facade:
 * if an eve upgrade rewords the prompt's opening or stops routing compaction
 * through `doGenerate`, this fails loudly instead of the validation silently
 * never firing. Same eve-dist deep-import posture as
 * `packages/runtime-ai/src/session-fetch.test.ts`.
 */
import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4GenerateResult,
} from "@ai-sdk/provider";
import {
  COMPACTION_SENTINEL,
  RECOVERED_CONTEXT_HEADER,
  buildValidationSystemPrompt,
  DEFAULT_MAX_RECOVERED_FACTS,
  withValidatedCompaction,
  type CompactionValidationReport,
} from "./validated-compaction";

const require = createRequire(import.meta.url);

type CompactMessagesFn = (
  messages: unknown,
  model: unknown,
  config: unknown,
) => Promise<unknown>;

async function loadCompactMessages(): Promise<CompactMessagesFn> {
  const eveRoot = dirname(require.resolve("eve/package.json"));
  const moduleUrl = pathToFileURL(
    join(eveRoot, "dist/src/harness/compaction.js"),
  ).href;
  const loaded: unknown = await import(moduleUrl);
  if (typeof loaded !== "object" || loaded === null) {
    throw new Error("eve compaction module did not load as an object");
  }
  const candidate = (loaded as Record<string, unknown>)["compactMessages"];
  if (typeof candidate !== "function") {
    throw new Error("eve dist no longer exports compactMessages");
  }
  return candidate as CompactMessagesFn;
}

function createCaptureModel(replies: string[]): {
  model: LanguageModelV4;
  calls: LanguageModelV4CallOptions[];
} {
  const queue = [...replies];
  const calls: LanguageModelV4CallOptions[] = [];
  const model: LanguageModelV4 = {
    specificationVersion: "v4",
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    supportedUrls: {},
    doGenerate(options): Promise<LanguageModelV4GenerateResult> {
      calls.push(options);
      const text = queue.shift();
      if (text === undefined) throw new Error("capture model exhausted");
      return Promise.resolve({
        content: [{ type: "text", text }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 50, noCache: 50, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 20, text: 20, reasoning: 0 },
        },
        warnings: [],
      });
    },
    doStream() {
      throw new Error("compaction must not stream");
    },
  };
  return { model, calls };
}

function messageAt(result: unknown, index: number): { role: unknown; content: unknown } {
  if (!Array.isArray(result)) throw new Error("expected a message array");
  const message: unknown = result[index];
  if (typeof message !== "object" || message === null) {
    throw new Error(`expected a message at index ${index}`);
  }
  const record = message as Record<string, unknown>;
  return { role: record["role"], content: record["content"] };
}

function promptSystemText(call: LanguageModelV4CallOptions | undefined): string {
  const first = call?.prompt[0];
  if (first?.role !== "system") throw new Error("expected a system message");
  return first.content;
}

function promptUserText(call: LanguageModelV4CallOptions | undefined): string {
  const chunks: string[] = [];
  for (const message of call?.prompt ?? []) {
    if (message.role !== "user") continue;
    for (const part of message.content) {
      if (part.type === "text") chunks.push(part.text);
    }
  }
  return chunks.join("\n\n");
}

describe("eve compaction through withValidatedCompaction", () => {
  test("eve's real compactMessages trips the sentinel and ships the repaired summary", async () => {
    const compactMessages = await loadCompactMessages();
    const summary = "Goal: ship the feature. Accomplished: some edits.";
    const missingFact =
      "The deploy token is minted by scripts/mint-token.ts and stored in .env";
    const { model, calls } = createCaptureModel([summary, `- ${missingFact}`]);
    const reports: CompactionValidationReport[] = [];
    const wrapped = withValidatedCompaction(model, {
      onValidation: (report) => reports.push(report),
    });

    const messages = [
      { role: "user", content: "Please wire the deploy token." },
      { role: "assistant", content: `I minted it: ${missingFact}.` },
      { role: "user", content: "Now update the docs." },
      { role: "assistant", content: "Docs updated in README.md." },
      { role: "user", content: "Run the tests." },
      { role: "assistant", content: "All 42 tests pass." },
    ];
    const compacted = await compactMessages(messages, wrapped, {
      recentWindowSize: 2,
      threshold: 100_000,
    });

    // The pin: eve's compaction system prompt starts with our sentinel and
    // arrives as non-streaming doGenerate traffic.
    expect(calls.length).toBe(2);
    expect(promptSystemText(calls[0]).startsWith(COMPACTION_SENTINEL)).toBe(true);
    expect(promptUserText(calls[0])).toContain("Conversation transcript:");
    expect(promptUserText(calls[0])).toContain("Please wire the deploy token.");
    expect(calls[0]?.temperature).toBe(0);

    // The second call is the judge, on the same model.
    expect(promptSystemText(calls[1])).toBe(
      buildValidationSystemPrompt(DEFAULT_MAX_RECOVERED_FACTS),
    );

    // The repaired summary rides eve's compacted history.
    expect(reports[0]?.kind).toBe("repaired");
    expect(messageAt(compacted, 0)).toEqual({
      role: "user",
      content: "Summary of our conversation so far:",
    });
    const summaryMessage = messageAt(compacted, 1);
    expect(summaryMessage.role).toBe("assistant");
    if (typeof summaryMessage.content !== "string") {
      throw new Error("expected a string summary message");
    }
    expect(summaryMessage.content.startsWith(summary)).toBe(true);
    expect(summaryMessage.content).toContain(RECOVERED_CONTEXT_HEADER);
    expect(summaryMessage.content).toContain(missingFact);

    // The recent window survives untouched.
    expect(messageAt(compacted, 2)).toEqual({
      role: "user",
      content: "Run the tests.",
    });
    expect(messageAt(compacted, 3)).toEqual({
      role: "assistant",
      content: "All 42 tests pass.",
    });
  });
});
