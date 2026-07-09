import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4GenerateResult,
  LanguageModelV4Usage,
} from "@ai-sdk/provider";
import {
  COMPACTION_SENTINEL,
  RECOVERED_CONTEXT_HEADER,
  buildRecoverySection,
  parseJudgeVerdict,
  withValidatedCompaction,
} from "./validated-compaction";

/** A fact as the judge would emit it: one line, trimmed, non-empty. */
const factArb = fc
  .string({ minLength: 1, maxLength: 60 })
  .map((s) => s.replace(/[\n\r]/g, " ").trim())
  .filter((s) => s !== "");

describe("parseJudgeVerdict laws", () => {
  test("total: any string parses in-contract, never throws", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 500 }), (text) => {
        const verdict = parseJudgeVerdict(text);
        if (verdict.kind === "nothing-missing") return;
        expect(verdict.facts.length).toBeGreaterThan(0);
        for (const fact of verdict.facts) {
          expect(fact).toBe(fact.trim());
          expect(fact).not.toBe("");
        }
      }),
    );
  });

  test("round-trip: a rendered bullet list parses back to its facts", () => {
    fc.assert(
      fc.property(fc.array(factArb, { minLength: 1, maxLength: 20 }), (facts) => {
        const reply = facts.map((fact) => `- ${fact}`).join("\n");
        expect(parseJudgeVerdict(reply)).toEqual({ kind: "missing", facts });
      }),
    );
  });
});

describe("buildRecoverySection laws", () => {
  test("null or in-budget, whole leading facts, honest truncated flag", () => {
    fc.assert(
      fc.property(
        fc.array(factArb, { maxLength: 20 }),
        fc.integer({ min: 0, max: 3000 }),
        (facts, maxChars) => {
          const section = buildRecoverySection(facts, maxChars);
          if (section === null) return;
          expect(section.text.length).toBeLessThanOrEqual(maxChars);
          expect(section.kept).toBeGreaterThan(0);
          expect(section.kept).toBeLessThanOrEqual(facts.length);
          expect(section.truncated).toBe(section.kept < facts.length);
          // The section is exactly header, intro, then the first `kept` facts as bullets.
          const lines = section.text.split("\n");
          expect(lines[0]).toBe(RECOVERED_CONTEXT_HEADER);
          expect(lines.slice(2)).toEqual(
            facts.slice(0, section.kept).map((fact) => `- ${fact}`),
          );
        },
      ),
    );
  });
});

const usage = (): LanguageModelV4Usage => ({
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
});

function scriptedModel(
  responses: readonly LanguageModelV4Content[][],
): LanguageModelV4 {
  const queue = [...responses];
  return {
    specificationVersion: "v4",
    provider: "scripted",
    modelId: "scripted-model",
    supportedUrls: {},
    doGenerate(): Promise<LanguageModelV4GenerateResult> {
      const content = queue.shift();
      if (content === undefined) throw new Error("scripted model exhausted");
      return Promise.resolve({
        content: [...content],
        finishReason: { unified: "stop", raw: "stop" },
        usage: usage(),
        warnings: [],
      });
    },
    doStream() {
      throw new Error("not used");
    },
  };
}

describe("withValidatedCompaction laws", () => {
  test("for any judge reply: only the last text part may change, and only by a recovery suffix", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.record({
              type: fc.constant<"text">("text"),
              text: fc.string({ maxLength: 80 }),
            }),
            fc.record({
              type: fc.constant<"reasoning">("reasoning"),
              text: fc.string({ maxLength: 40 }),
            }),
          ),
          { minLength: 1, maxLength: 5 },
        ),
        fc.string({ maxLength: 300 }),
        async (summaryContent, judgeReply) => {
          const model = scriptedModel([
            summaryContent,
            [{ type: "text", text: judgeReply }],
          ]);
          const wrapped = withValidatedCompaction(model);
          const options: LanguageModelV4CallOptions = {
            prompt: [
              { role: "system", content: `${COMPACTION_SENTINEL} Summarize.` },
              { role: "user", content: [{ type: "text", text: "transcript" }] },
            ],
          };
          const result = await wrapped.doGenerate(options);
          expect(result.content.length).toBe(summaryContent.length);
          const lastTextIndex = summaryContent.findLastIndex(
            (part) => part.type === "text",
          );
          for (const [index, part] of result.content.entries()) {
            const original = summaryContent[index];
            if (original === undefined) throw new Error("length mismatch");
            if (
              index === lastTextIndex &&
              part.type === "text" &&
              original.type === "text"
            ) {
              expect(part.text.startsWith(original.text)).toBe(true);
              const suffix = part.text.slice(original.text.length);
              if (suffix !== "") {
                expect(
                  suffix.startsWith(`\n\n${RECOVERED_CONTEXT_HEADER}\n`),
                ).toBe(true);
              }
            } else {
              expect(part).toEqual(original);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
