// Stream-grammar conformance for the mock model: every scenario, every script
// step, and every abort point must produce a well-formed LanguageModelV4 part
// sequence. The mock exists to pressure-test real clients, so a malformed
// stream here would test the clients against shapes no provider emits — the
// grammar is pinned mechanically instead of trusted.
import { describe, expect, test } from "bun:test";
import type {
  LanguageModelV4CallOptions,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider";
import {
  createMockStoryModel,
  MOCK_SCENARIOS,
  scriptActionFor,
  type MockScriptedScenario,
} from "./mock-model";

// --- The grammar -------------------------------------------------------------

/**
 * Violations of the LanguageModelV4 stream part grammar:
 * - the stream is non-empty and opens with exactly one `stream-start`;
 * - `text` / `reasoning` / `tool-input` blocks open, delta, and close by id,
 *   with no delta or end outside an open block and no id reuse;
 * - every `tool-call` follows its own closed `tool-input` block and carries
 *   the same tool name;
 * - the stream ends with exactly one terminal part (`finish` or `error`),
 *   nothing follows it, and no block is left open at the terminal.
 */
function streamGrammarViolations(parts: readonly LanguageModelV4StreamPart[]): string[] {
  const violations: string[] = [];
  if (parts.length === 0) return ["stream is empty"];
  if (parts[0]?.type !== "stream-start") violations.push("first part is not stream-start");

  type BlockKind = "text" | "reasoning" | "tool-input";
  const open = new Map<string, { kind: BlockKind; toolName?: string }>();
  const closed = new Map<string, { kind: BlockKind; toolName?: string }>();
  let terminal: string | null = null;

  const openBlock = (kind: BlockKind, id: string, at: number, toolName?: string) => {
    if (open.has(id) || closed.has(id)) violations.push(`part ${at}: ${kind} id "${id}" reused`);
    open.set(id, { kind, ...(toolName !== undefined ? { toolName } : {}) });
  };
  const requireOpen = (kind: BlockKind, id: string, at: number) => {
    const block = open.get(id);
    if (!block || block.kind !== kind) {
      violations.push(`part ${at}: ${kind} part for id "${id}" without an open ${kind} block`);
    }
    return block;
  };
  const closeBlock = (kind: BlockKind, id: string, at: number) => {
    const block = requireOpen(kind, id, at);
    open.delete(id);
    if (block) closed.set(id, block);
  };

  for (const [at, part] of parts.entries()) {
    if (terminal !== null) {
      violations.push(`part ${at}: "${part.type}" after terminal "${terminal}"`);
      continue;
    }
    switch (part.type) {
      case "stream-start":
        if (at !== 0) violations.push(`part ${at}: stream-start not first`);
        break;
      case "response-metadata":
        break;
      case "text-start":
        openBlock("text", part.id, at);
        break;
      case "text-delta":
        requireOpen("text", part.id, at);
        break;
      case "text-end":
        closeBlock("text", part.id, at);
        break;
      case "reasoning-start":
        openBlock("reasoning", part.id, at);
        break;
      case "reasoning-delta":
        requireOpen("reasoning", part.id, at);
        break;
      case "reasoning-end":
        closeBlock("reasoning", part.id, at);
        break;
      case "tool-input-start":
        openBlock("tool-input", part.id, at, part.toolName);
        break;
      case "tool-input-delta":
        requireOpen("tool-input", part.id, at);
        break;
      case "tool-input-end":
        closeBlock("tool-input", part.id, at);
        break;
      case "tool-call": {
        const input = closed.get(part.toolCallId);
        if (!input || input.kind !== "tool-input") {
          violations.push(
            `part ${at}: tool-call "${part.toolCallId}" without a closed tool-input block`,
          );
        } else if (input.toolName !== part.toolName) {
          violations.push(
            `part ${at}: tool-call "${part.toolCallId}" name "${part.toolName}" != input block "${input.toolName}"`,
          );
        }
        break;
      }
      case "finish":
      case "error":
        terminal = part.type;
        if (open.size > 0) {
          violations.push(
            `part ${at}: ${part.type} with open blocks: ${[...open.keys()].join(", ")}`,
          );
        }
        break;
      default:
        violations.push(`part ${at}: unexpected part type "${(part as { type: string }).type}"`);
    }
  }
  if (terminal === null) violations.push("stream has no terminal finish/error part");
  return violations;
}

// --- Drivers -----------------------------------------------------------------

const SCRIPTED: readonly MockScriptedScenario[] = ["hitl", "parallel", "todo", "delegate"];

/** A prompt that puts a scripted scenario at `step` (step = tool results so far). */
function promptAtStep(directive: string, step: number): LanguageModelV4Prompt {
  const prompt: LanguageModelV4Prompt = [
    { role: "user", content: [{ type: "text", text: `drive the script ${directive}` }] },
  ];
  for (let i = 0; i < step; i++) {
    prompt.push({
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: `c${i}`,
          toolName: "todo",
          output: { type: "json", value: {} },
        },
      ],
    });
  }
  return prompt;
}

/** Steps a scripted scenario needs to reach its wrap-up text, inclusive. */
function stepsToWrapUp(scenario: MockScriptedScenario): number {
  for (let step = 0; step < 10; step++) {
    if (scriptActionFor(scenario, step).kind === "text") return step;
  }
  throw new Error(`scenario ${scenario} never reaches a text action`);
}

async function collect(
  stream: ReadableStream<LanguageModelV4StreamPart>,
): Promise<LanguageModelV4StreamPart[]> {
  const parts: LanguageModelV4StreamPart[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return parts;
    parts.push(value);
  }
}

function fastModel() {
  return createMockStoryModel({
    chunkCount: 6,
    chunkDelayMs: 0,
    burstChunks: 12,
    now: () => 1_000,
  });
}

/** Every distinct turn the mock can produce: scenario × step, plus the story. */
function allTurns(): readonly { label: string; prompt: LanguageModelV4Prompt }[] {
  const turns: { label: string; prompt: LanguageModelV4Prompt }[] = [
    { label: "story", prompt: promptAtStep("no directive here", 0) },
  ];
  for (const scenario of MOCK_SCENARIOS) {
    const scripted = (SCRIPTED as readonly string[]).includes(scenario);
    const lastStep = scripted ? stepsToWrapUp(scenario as MockScriptedScenario) : 0;
    for (let step = 0; step <= lastStep; step++) {
      turns.push({
        label: `[mock:${scenario}] step ${step}`,
        prompt: promptAtStep(`[mock:${scenario}]`, step),
      });
    }
  }
  return turns;
}

// --- The suite ---------------------------------------------------------------

describe("stream grammar conformance", () => {
  test("every scenario at every script step emits a grammatical stream", async () => {
    for (const turn of allTurns()) {
      const { stream } = await fastModel().doStream({
        prompt: turn.prompt,
      } as LanguageModelV4CallOptions);
      const parts = await collect(stream);
      expect({ turn: turn.label, violations: streamGrammarViolations(parts) }).toEqual({
        turn: turn.label,
        violations: [],
      });
    }
  });

  test("scripted turns finish on tool-calls until the wrap-up step, then stop", async () => {
    for (const scenario of SCRIPTED) {
      const wrapUp = stepsToWrapUp(scenario);
      for (let step = 0; step <= wrapUp; step++) {
        const { stream } = await fastModel().doStream({
          prompt: promptAtStep(`[mock:${scenario}]`, step),
        } as LanguageModelV4CallOptions);
        const parts = await collect(stream);
        const finish = parts.at(-1);
        if (finish?.type !== "finish") throw new Error(`${scenario} step ${step}: no finish`);
        expect({ scenario, step, reason: finish.finishReason.unified }).toEqual({
          scenario,
          step,
          reason: step < wrapUp ? "tool-calls" : "stop",
        });
      }
    }
  });

  test("every scripted scenario wraps up within three steps for any later step", () => {
    for (const scenario of SCRIPTED) {
      const wrapUp = stepsToWrapUp(scenario);
      expect(wrapUp).toBeLessThanOrEqual(3);
      // The script never runs out: any step at or past the wrap-up is text,
      // so an extra tool result (e.g. a retried call) can't strand the turn.
      for (let step = wrapUp; step < wrapUp + 5; step++) {
        expect(scriptActionFor(scenario, step).kind).toBe("text");
      }
    }
  });

  test("aborting at every part boundary still yields a grammatical stream", async () => {
    // The mock's abort contract: an aborted turn truncates content but always
    // closes open blocks and terminates — a torn stream (open block, no
    // terminal) would exercise clients against a shape providers don't emit.
    for (const turn of allTurns()) {
      // Length of the unaborted stream bounds the abort positions.
      const { stream: fullStream } = await fastModel().doStream({
        prompt: turn.prompt,
      } as LanguageModelV4CallOptions);
      const fullLength = (await collect(fullStream)).length;

      for (let abortAfter = 0; abortAfter <= fullLength; abortAfter++) {
        const controller = new AbortController();
        const { stream } = await fastModel().doStream({
          prompt: turn.prompt,
          abortSignal: controller.signal,
        } as LanguageModelV4CallOptions);
        const reader = stream.getReader();
        const parts: LanguageModelV4StreamPart[] = [];
        for (;;) {
          if (parts.length === abortAfter && !controller.signal.aborted) controller.abort();
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value);
        }
        expect({
          turn: turn.label,
          abortAfter,
          violations: streamGrammarViolations(parts),
        }).toEqual({ turn: turn.label, abortAfter, violations: [] });
      }
    }
  });

  test("the same prompt and clock produce byte-identical streams", async () => {
    for (const turn of allTurns()) {
      const run = async () => {
        const { stream } = await fastModel().doStream({
          prompt: turn.prompt,
        } as LanguageModelV4CallOptions);
        return collect(stream);
      };
      expect(await run()).toEqual(await run());
    }
  });
});
