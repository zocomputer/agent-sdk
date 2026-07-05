import { describe, expect, test } from "bun:test";
import type {
  LanguageModelV4CallOptions,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider";
import {
  createMockStoryModel,
  lastUserTextFrom,
  MOCK_SCENARIOS,
  mockScenarioFrom,
  scriptActionFor,
  scriptStepFrom,
  toolInputFragments,
} from "./mock-model";

function callOptions(userText: string): LanguageModelV4CallOptions {
  return {
    prompt: [{ role: "user", content: [{ type: "text", text: userText }] }],
  } as LanguageModelV4CallOptions;
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

describe("createMockStoryModel", () => {
  test("streams the configured number of deltas and finishes with stop", async () => {
    const model = createMockStoryModel({ chunkCount: 5, chunkDelayMs: 0 });
    const { stream } = await model.doStream(callOptions("Tell me a story about a lighthouse."));
    const parts = await collect(stream);

    expect(parts[0]).toEqual({ type: "stream-start", warnings: [] });
    const deltas = parts.filter((p) => p.type === "text-delta");
    // The topic header plus one delta per chunk.
    expect(deltas.length).toBe(6);
    const finish = parts.at(-1);
    if (finish?.type !== "finish") throw new Error("expected a finish part");
    expect(finish.finishReason.unified).toBe("stop");
  });

  test("echoes the asking prompt so parallel chats stay distinguishable", async () => {
    const model = createMockStoryModel({ chunkCount: 1, chunkDelayMs: 0 });
    const { stream } = await model.doStream(callOptions("Story B: a submarine saga."));
    const parts = await collect(stream);
    const header = parts.find((p) => p.type === "text-delta");
    if (header?.type !== "text-delta") throw new Error("expected a text delta");
    expect(header.delta).toContain("Story B: a submarine saga.");
  });

  test("a [mock:hitl] turn emits an ask_question tool call and finishes on tool-calls", async () => {
    const model = createMockStoryModel({ chunkCount: 1, chunkDelayMs: 0 });
    const { stream } = await model.doStream(callOptions("Run the HITL check [mock:hitl]"));
    const parts = await collect(stream);

    const toolCall = parts.find((p) => p.type === "tool-call");
    if (toolCall?.type !== "tool-call") throw new Error("expected a tool call");
    expect(toolCall.toolName).toBe("ask_question");
    const input: unknown = JSON.parse(toolCall.input);
    expect(input).toMatchObject({ allowFreeform: true });
    // Reasoning streams before the call, so the Thinking… display renders too.
    expect(parts.some((p) => p.type === "reasoning-delta")).toBe(true);
    const finish = parts.at(-1);
    if (finish?.type !== "finish") throw new Error("expected a finish part");
    expect(finish.finishReason.unified).toBe("tool-calls");
  });

  test("tool input streams as fragmented deltas that reassemble to the call's input", async () => {
    const model = createMockStoryModel({ chunkCount: 1, chunkDelayMs: 0 });
    const { stream } = await model.doStream(callOptions("Run the HITL check [mock:hitl]"));
    const parts = await collect(stream);

    const inputDeltas = parts.filter((p) => p.type === "tool-input-delta");
    // A real model streams tool args in fragments; one blob delta hides
    // arg-streaming renderer bugs.
    expect(inputDeltas.length).toBeGreaterThan(3);
    const reassembled = inputDeltas.map((p) => p.delta).join("");
    const toolCall = parts.find((p) => p.type === "tool-call");
    if (toolCall?.type !== "tool-call") throw new Error("expected a tool call");
    expect(reassembled).toBe(toolCall.input);
  });

  test("a [mock:parallel] turn emits two ask_question calls in one response", async () => {
    const model = createMockStoryModel({ chunkCount: 1, chunkDelayMs: 0 });
    const { stream } = await model.doStream(callOptions("Two questions [mock:parallel]"));
    const parts = await collect(stream);

    const toolCalls = parts.filter((p) => p.type === "tool-call");
    expect(toolCalls.length).toBe(2);
    expect(toolCalls.every((c) => c.toolName === "ask_question")).toBe(true);
    const ids = toolCalls.map((c) => c.toolCallId);
    expect(new Set(ids).size).toBe(2);
    const finish = parts.at(-1);
    if (finish?.type !== "finish") throw new Error("expected a finish part");
    expect(finish.finishReason.unified).toBe("tool-calls");
  });

  test("after a tool result, a scripted turn advances to the next step", async () => {
    const model = createMockStoryModel({ chunkCount: 1, chunkDelayMs: 0 });
    const prompt: LanguageModelV4Prompt = [
      { role: "user", content: [{ type: "text", text: "checklist please [mock:todo]" }] },
      {
        role: "assistant",
        content: [{ type: "tool-call", toolCallId: "c0", toolName: "todo", input: "{}" }],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "c0",
            toolName: "todo",
            output: { type: "json", value: {} },
          },
        ],
      },
    ];
    const { stream } = await model.doStream({ prompt } as LanguageModelV4CallOptions);
    const parts = await collect(stream);
    const toolCall = parts.find((p) => p.type === "tool-call");
    if (toolCall?.type !== "tool-call") throw new Error("expected the step-1 todo call");
    expect(toolCall.toolCallId).toBe("mock-call-todo-1-0");
  });

  test("stops streaming when aborted", async () => {
    const controller = new AbortController();
    const model = createMockStoryModel({ chunkCount: 1000, chunkDelayMs: 1 });
    const { stream } = await model.doStream({
      ...callOptions("abort me"),
      abortSignal: controller.signal,
    });
    const reader = stream.getReader();
    await reader.read(); // stream-start
    controller.abort();
    let count = 0;
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
      count += 1;
    }
    // Far fewer than the 1000 configured chunks: the abort cut the loop.
    expect(count).toBeLessThan(50);
  });

  test("an injected clock makes the full stream deterministic across runs", async () => {
    const run = async () => {
      const model = createMockStoryModel({ chunkCount: 3, chunkDelayMs: 0, now: () => 1_000 });
      const { stream } = await model.doStream(callOptions("same story twice [mock:markdown]"));
      return collect(stream);
    };
    expect(await run()).toEqual(await run());
  });
});

describe("the scenario script", () => {
  test("mockScenarioFrom parses every catalog directive and rejects unknown ones", () => {
    for (const scenario of MOCK_SCENARIOS) {
      expect(mockScenarioFrom(`do the thing [mock:${scenario}] now`)).toBe(scenario);
    }
    expect(mockScenarioFrom("[mock:bogus]")).toBeNull();
    expect(mockScenarioFrom("no directive")).toBeNull();
  });

  test("a [mock:fail] turn ends the stream in a terminal error part", async () => {
    const model = createMockStoryModel({ chunkCount: 1, chunkDelayMs: 0 });
    const { stream } = await model.doStream(callOptions("break please [mock:fail]"));
    const parts = await collect(stream);
    const last = parts.at(-1);
    if (last?.type !== "error") throw new Error("expected an error part last");
    expect(String(last.error)).toContain("injected mid-stream failure");
    expect(parts.some((p) => p.type === "finish")).toBe(false);
  });

  test("a [mock:markdown] turn streams the structure-heavy chunks and finishes", async () => {
    const model = createMockStoryModel({ chunkCount: 1, chunkDelayMs: 0 });
    const { stream } = await model.doStream(callOptions("render this [mock:markdown]"));
    const parts = await collect(stream);
    const text = parts
      .flatMap((p) => (p.type === "text-delta" ? [p.delta] : []))
      .join("");
    expect(text).toContain("```ts");
    expect(text).toContain("| tide | bell | fog |");
    expect(text).toContain("Done. ✅");
    expect(parts.at(-1)?.type).toBe("finish");
  });

  test("a [mock:burst] turn streams every delta with no pacing and finishes", async () => {
    const model = createMockStoryModel({ chunkCount: 1, chunkDelayMs: 1000, burstChunks: 40 });
    const started = Date.now();
    const { stream } = await model.doStream(callOptions("throughput [mock:burst]"));
    const parts = await collect(stream);
    // Header + 40 chunks + trailer; well under the 1s pacing delay proves
    // the burst path ignores chunkDelayMs.
    expect(parts.filter((p) => p.type === "text-delta").length).toBe(42);
    expect(Date.now() - started).toBeLessThan(900);
    expect(parts.at(-1)?.type).toBe("finish");
  });

  test("a [mock:interleave] turn alternates reasoning and text blocks with distinct ids", async () => {
    const model = createMockStoryModel({ chunkCount: 1, chunkDelayMs: 0 });
    const { stream } = await model.doStream(callOptions("blocks [mock:interleave]"));
    const parts = await collect(stream);

    const blockStarts = parts.flatMap((p) =>
      p.type === "reasoning-start" || p.type === "text-start" ? [{ type: p.type, id: p.id }] : [],
    );
    expect(blockStarts).toEqual([
      { type: "reasoning-start", id: "r1" },
      { type: "text-start", id: "t1" },
      { type: "reasoning-start", id: "r2" },
      { type: "text-start", id: "t2" },
    ]);
    expect(parts.at(-1)?.type).toBe("finish");
  });

  test("a [mock:empty] turn finishes with zero content parts", async () => {
    const model = createMockStoryModel({ chunkCount: 1, chunkDelayMs: 0 });
    const { stream } = await model.doStream(callOptions("nothing [mock:empty]"));
    const parts = await collect(stream);

    expect(parts.map((p) => p.type)).toEqual(["stream-start", "response-metadata", "finish"]);
    const finish = parts.at(-1);
    if (finish?.type !== "finish") throw new Error("expected a finish part");
    expect(finish.finishReason.unified).toBe("stop");
  });

  test("scriptStepFrom counts tool results since the last user message", () => {
    const user = { role: "user" as const, content: [{ type: "text" as const, text: "hi" }] };
    const toolResult = (id: string) => ({
      type: "tool-result" as const,
      toolCallId: id,
      toolName: "todo",
      output: { type: "json" as const, value: {} },
    });
    const tool = { role: "tool" as const, content: [toolResult("c")] };
    expect(scriptStepFrom([user])).toBe(0);
    expect(scriptStepFrom([user, tool])).toBe(1);
    expect(scriptStepFrom([user, tool, tool])).toBe(2);
    // Two results in ONE tool message (parallel calls) also count as two —
    // the step must advance identically however the harness batches results.
    const batched = { role: "tool" as const, content: [toolResult("a"), toolResult("b")] };
    expect(scriptStepFrom([user, batched])).toBe(2);
    // A follow-up user turn resets the script.
    expect(scriptStepFrom([user, tool, user])).toBe(0);
  });

  test("lastUserTextFrom finds the latest user text through assistant and tool turns", () => {
    const prompt: LanguageModelV4Prompt = [
      { role: "user", content: [{ type: "text", text: "first" }] },
      { role: "assistant", content: [{ type: "text", text: "reply" }] },
      { role: "user", content: [{ type: "text", text: "second" }] },
    ];
    expect(lastUserTextFrom(prompt)).toBe("second");
    expect(lastUserTextFrom([])).toBeUndefined();
  });

  test("every scripted scenario ends in a text action", () => {
    expect(scriptActionFor("hitl", 1).kind).toBe("text");
    expect(scriptActionFor("parallel", 2).kind).toBe("text");
    expect(scriptActionFor("todo", 2).kind).toBe("text");
    expect(scriptActionFor("delegate", 1).kind).toBe("text");
  });

  test("the parallel script only claims both answers after two results", () => {
    // step = tool results so far; a harness resuming after ONE answered
    // question must not see a wrap-up claiming both answers arrived.
    const afterOne = scriptActionFor("parallel", 1);
    const afterBoth = scriptActionFor("parallel", 2);
    if (afterOne.kind !== "text" || afterBoth.kind !== "text") {
      throw new Error("expected text actions");
    }
    expect(afterOne.text).toContain("Only one answer arrived");
    expect(afterOne.text).not.toContain("Both answers received");
    expect(afterBoth.text).toContain("Both answers received");
  });

  test("the parallel script emits two ask_question calls at step 0", () => {
    const action = scriptActionFor("parallel", 0);
    if (action.kind !== "tool-calls") throw new Error("expected tool calls");
    expect(action.calls.length).toBe(2);
    expect(action.calls.every((c) => c.toolName === "ask_question")).toBe(true);
    const prompts = action.calls.map((c) => c.input.prompt);
    // Distinct prompts, so the two pending HITL cards are distinguishable.
    expect(new Set(prompts).size).toBe(2);
  });

  test("the todo script writes then updates the same list", () => {
    const first = scriptActionFor("todo", 0);
    const second = scriptActionFor("todo", 1);
    if (first.kind !== "tool-calls" || second.kind !== "tool-calls") {
      throw new Error("expected tool calls");
    }
    const firstCall = first.calls[0];
    const secondCall = second.calls[0];
    if (!firstCall || !secondCall) throw new Error("expected one call per step");
    expect(firstCall.toolName).toBe("todo");
    expect(secondCall.toolName).toBe("todo");
    const firstTodos = firstCall.input.todos;
    const secondTodos = secondCall.input.todos;
    if (!Array.isArray(firstTodos) || !Array.isArray(secondTodos)) {
      throw new Error("expected todo lists");
    }
    expect(firstTodos.length).toBe(secondTodos.length);
  });

  test("the delegate script targets the configured tool name, defaulting to task_fast", () => {
    const action = scriptActionFor("delegate", 0, "scout");
    if (action.kind !== "tool-calls") throw new Error("expected tool calls");
    expect(action.calls[0]?.toolName).toBe("scout");
    const defaulted = scriptActionFor("delegate", 0);
    if (defaulted.kind !== "tool-calls") throw new Error("expected tool calls");
    expect(defaulted.calls[0]?.toolName).toBe("task_fast");
  });

  test("toolInputFragments splits and reassembles losslessly", () => {
    expect(toolInputFragments("")).toEqual([]);
    expect(toolInputFragments("abc", 24)).toEqual(["abc"]);
    const long = JSON.stringify({ key: "x".repeat(100) });
    const fragments = toolInputFragments(long, 7);
    expect(fragments.join("")).toBe(long);
    expect(fragments.every((f, i) => (i < fragments.length - 1 ? f.length === 7 : f.length > 0))).toBe(
      true,
    );
  });
});
