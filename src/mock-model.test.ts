import { describe, expect, test } from "bun:test";
import type {
  LanguageModelV4CallOptions,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider";
import {
  createMockStoryModel,
  mockScenarioFrom,
  scriptActionFor,
  scriptStepFrom,
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
    expect(toolCall.toolCallId).toBe("mock-call-todo-1");
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
});

describe("the scenario script", () => {
  test("mockScenarioFrom parses directives and rejects unknown ones", () => {
    expect(mockScenarioFrom("do the thing [mock:hitl] now")).toBe("hitl");
    expect(mockScenarioFrom("[mock:todo]")).toBe("todo");
    expect(mockScenarioFrom("[mock:explore]")).toBe("explore");
    expect(mockScenarioFrom("[mock:fail]")).toBe("fail");
    expect(mockScenarioFrom("[mock:burst]")).toBe("burst");
    expect(mockScenarioFrom("[mock:markdown]")).toBe("markdown");
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

  test("scriptStepFrom counts tool messages since the last user message", () => {
    const user = { role: "user" as const, content: [{ type: "text" as const, text: "hi" }] };
    const tool = {
      role: "tool" as const,
      content: [
        {
          type: "tool-result" as const,
          toolCallId: "c",
          toolName: "todo",
          output: { type: "json" as const, value: {} },
        },
      ],
    };
    expect(scriptStepFrom([user])).toBe(0);
    expect(scriptStepFrom([user, tool])).toBe(1);
    expect(scriptStepFrom([user, tool, tool])).toBe(2);
    // A follow-up user turn resets the script.
    expect(scriptStepFrom([user, tool, user])).toBe(0);
  });

  test("every scenario ends in a text action", () => {
    expect(scriptActionFor("hitl", 1).kind).toBe("text");
    expect(scriptActionFor("todo", 2).kind).toBe("text");
    expect(scriptActionFor("explore", 1).kind).toBe("text");
  });

  test("the todo script writes then updates the same list", () => {
    const first = scriptActionFor("todo", 0);
    const second = scriptActionFor("todo", 1);
    if (first.kind !== "tool-call" || second.kind !== "tool-call") {
      throw new Error("expected tool calls");
    }
    expect(first.toolName).toBe("todo");
    expect(second.toolName).toBe("todo");
    const firstTodos = first.input.todos;
    const secondTodos = second.input.todos;
    if (!Array.isArray(firstTodos) || !Array.isArray(secondTodos)) {
      throw new Error("expected todo lists");
    }
    expect(firstTodos.length).toBe(secondTodos.length);
  });
});
