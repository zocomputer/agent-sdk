// A slow-streaming mock LanguageModelV4 for testing an eve agent's clients
// without inference credentials: everything past the model call — session
// routes, harness, framework tools, subagents, durable streams — runs REAL;
// only inference is canned. Gate it behind an env flag in the consumer's
// agent.ts (rib: RIB_MOCK_MODEL=1); never active in a normal run. Two modes, picked per turn from the user prompt:
//
// - Default: streams a long deterministic "story" as text deltas with a
//   per-chunk delay, so a turn stays in-flight for a configurable window —
//   what exercising the rail's in-progress states and chat switching needs.
// - Scripted tool calls, via a `[mock:<scenario>]` directive in the message:
//   `[mock:hitl]` calls eve's ask_question (options with styles + freeform),
//   `[mock:todo]` writes then updates a todo list, `[mock:explore]` delegates
//   to the explore subagent. Each scenario ends with a short wrap-up text, so
//   the HITL prompt, todo checklist, and subagent card render end-to-end.
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4Usage,
} from "@ai-sdk/provider";

export interface MockStoryModelOptions {
  /** Text deltas per story turn. Default 240 (~60s at the default delay). */
  chunkCount?: number;
  /** Delay between deltas in ms. Default 250. */
  chunkDelayMs?: number;
  /** Deltas for a `[mock:burst]` turn (no pacing). Default 600. */
  burstChunks?: number;
  /** The declared subagent tool `[mock:explore]` delegates to. Default "explore". */
  delegateToolName?: string;
}

const STORY_SENTENCES = [
  "The lighthouse keeper counted the waves as they broke against the rocks.",
  "Every seventh wave carried a whisper from the old town beneath the sea.",
  "Marisol had kept the light burning for forty-one years without a single dark night.",
  "Tonight the fog rolled in thicker than she had ever seen it.",
  "Somewhere out past the shoals, a bell rang that no ship had carried in decades.",
  "She climbed the spiral stairs slowly, lantern in one hand, logbook in the other.",
  "The glass at the top of the tower was cold and streaked with salt.",
  "Below, the sea moved like a great animal turning in its sleep.",
  "She wrote the date in the logbook and then paused, pen hovering.",
  "The bell rang again, closer now, and the fog pressed against the windows.",
];

function storyChunk(index: number): string {
  const sentence = STORY_SENTENCES[index % STORY_SENTENCES.length] ?? "The story went on.";
  const paragraphBreak = index > 0 && index % 8 === 0 ? "\n\n" : " ";
  return `${paragraphBreak}${sentence}`;
}

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function usageFor(outputTokens: number): LanguageModelV4Usage {
  return {
    inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: outputTokens, text: outputTokens, reasoning: 0 },
  };
}

// --- Scripted scenarios (pure helpers, unit-tested) -------------------------

// Multi-step tool scripts plus three stream shapes: `fail` ends the stream in
// a terminal error part (the deterministic trigger for the failed-turn UX),
// `burst` streams RIB_MOCK_BURST_CHUNKS deltas with no pacing delay — a
// renderer-throughput probe for the cockpits' streaming pipelines — and
// `markdown` streams structure-heavy markdown (fences, tables, nested lists)
// that opens blocks mid-delta, the streaming-renderer stability probe.
export const MOCK_SCENARIOS = ["hitl", "todo", "explore", "fail", "burst", "markdown"] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number];
export type MockScriptedScenario = Extract<MockScenario, "hitl" | "todo" | "explore">;

/**
 * Markdown chunks that deliberately split structure across deltas: a fence
 * opens in one delta and closes several later, table rows arrive one at a
 * time, list nesting grows mid-stream. A streaming renderer must keep the
 * trailing block stable through all of it.
 */
export function markdownChunks(): readonly string[] {
  return [
    "## Streaming markdown stress\n\n",
    "A paragraph with **bold**, _italic_, `inline code`, and a [link](https://example.com).\n\n",
    "```ts\n",
    "export function keeper(light: number): string {\n",
    "  // the fence stays open across deltas\n",
    "  return `burning for ${light} years`;\n",
    "}\n",
    "```\n\n",
    "| tide | bell | fog |\n",
    "| --- | --- | --- |\n",
    "| low | quiet | thin |\n",
    "| high | ringing | thick |\n\n",
    "1. climb the stairs\n",
    "   - lantern in one hand\n",
    "   - logbook in the other\n",
    "2. write the date\n",
    "   1. pause, pen hovering\n",
    "   2. listen for the bell\n\n",
    "> The sea moved like a great animal turning in its sleep.\n\n",
    "Unicode: emoji 🌊🔔, CJK 灯台守は波を数えた, RTL مرحبا, combining é ñ ü.\n\n",
    "A very long unbroken token: " + "abcdefghij".repeat(40) + "\n\n",
    "Done. ✅\n",
  ];
}

/** The `[mock:<scenario>]` directive in the turn's user text, if any. */
export function mockScenarioFrom(text: string): MockScenario | null {
  const match = /\[mock:([a-z]+)\]/.exec(text);
  const name = match?.[1];
  return (MOCK_SCENARIOS as readonly string[]).includes(name ?? "")
    ? (name as MockScenario)
    : null;
}

/**
 * Which step of a scripted scenario this doStream call is: the number of tool
 * messages since the last user message. Step 0 emits the scenario's first tool
 * call; each tool result advances the script.
 */
export function scriptStepFrom(prompt: LanguageModelV4Prompt): number {
  let step = 0;
  for (const message of prompt) {
    if (message.role === "user") step = 0;
    else if (message.role === "tool") step += 1;
  }
  return step;
}

/** The last user message's plain text, for topic echo + directive parsing. */
export function lastUserTextFrom(prompt: LanguageModelV4Prompt): string | undefined {
  return [...prompt]
    .reverse()
    .flatMap((message) =>
      message.role === "user"
        ? message.content.flatMap((part) => (part.type === "text" ? [part.text] : []))
        : [],
    )[0];
}

type ScriptAction =
  | { kind: "tool-call"; toolName: string; input: Record<string, unknown> }
  | { kind: "text"; text: string };

/** The scripted action for a scenario at a step; `text` actions end the turn. */
export function scriptActionFor(
  scenario: MockScriptedScenario,
  step: number,
  delegateToolName = "explore",
): ScriptAction {
  switch (scenario) {
    case "hitl":
      if (step === 0) {
        return {
          kind: "tool-call",
          toolName: "ask_question",
          input: {
            prompt: "Mock HITL: how should this test proceed?",
            options: [
              { id: "ship", label: "Ship it", style: "primary", description: "Proceed with the happy path." },
              { id: "hold", label: "Hold for review" },
              { id: "abort", label: "Abort the run", style: "danger", description: "Stops everything." },
            ],
            allowFreeform: true,
          },
        };
      }
      return { kind: "text", text: "Answer received — the mock turn resumed and finished cleanly." };
    case "todo":
      if (step === 0) {
        return {
          kind: "tool-call",
          toolName: "todo",
          input: {
            todos: [
              { content: "Survey the harbor charts", status: "completed", priority: "high" },
              { content: "Polish the tower glass", status: "in_progress", priority: "medium" },
              { content: "Refill the oil reserves", status: "pending", priority: "medium" },
              { content: "Log the evening tide", status: "pending", priority: "low" },
            ],
          },
        };
      }
      if (step === 1) {
        return {
          kind: "tool-call",
          toolName: "todo",
          input: {
            todos: [
              { content: "Survey the harbor charts", status: "completed", priority: "high" },
              { content: "Polish the tower glass", status: "completed", priority: "medium" },
              { content: "Refill the oil reserves", status: "in_progress", priority: "medium" },
              { content: "Log the evening tide", status: "cancelled", priority: "low" },
            ],
          },
        };
      }
      return { kind: "text", text: "Todo list written and updated — checklist scenario complete." };
    case "explore":
      if (step === 0) {
        return {
          kind: "tool-call",
          toolName: "explore",
          input: {
            message:
              "Mock delegation: describe the lighthouse keeper's routine. Reply with a short report.",
          },
        };
      }
      return { kind: "text", text: "The explorer reported back — delegation scenario complete." };
  }
}

// --- The model ---------------------------------------------------------------

export function createMockStoryModel(options: MockStoryModelOptions = {}): LanguageModelV4 {
  const chunkCount = options.chunkCount ?? 240;
  const chunkDelayMs = options.chunkDelayMs ?? 250;
  const burstChunks = options.burstChunks ?? 600;
  const delegateToolName = options.delegateToolName ?? "explore";
  return {
    specificationVersion: "v4",
    // eve's compaction compiler requires context-window metadata, which it
    // resolves for provider instances via `formatLanguageModelGatewayId`
    // (provider + modelId → an AI Gateway catalog slug). Borrow a real
    // catalog identity so the mock compiles; routing stays "external", so no
    // request ever reaches Anthropic.
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    supportedUrls: {},
    async doGenerate() {
      return {
        content: [{ type: "text" as const, text: "(mock model, non-streaming reply)" }],
        finishReason: { unified: "stop" as const, raw: "stop" },
        usage: usageFor(10),
        warnings: [],
      };
    },
    async doStream(callOptions: LanguageModelV4CallOptions) {
      const abortSignal = callOptions.abortSignal;
      const lastUserText = lastUserTextFrom(callOptions.prompt);
      const scenario = mockScenarioFrom(lastUserText ?? "");
      const step = scriptStepFrom(callOptions.prompt);
      // Echo the asking prompt into the output so parallel chats render
      // distinguishable transcripts (the canned sentences repeat otherwise).
      const topic = (lastUserText ?? "an untitled request").slice(0, 60);
      const stream = new ReadableStream<LanguageModelV4StreamPart>({
        async start(controller) {
          controller.enqueue({ type: "stream-start", warnings: [] });
          controller.enqueue({
            type: "response-metadata",
            id: `mock-${Date.now()}`,
            modelId: "claude-sonnet-4-6",
            timestamp: new Date(),
          });

          if (scenario === "fail") {
            controller.enqueue({ type: "text-start", id: "t1" });
            for (let i = 0; i < 6; i++) {
              if (abortSignal?.aborted) break;
              await delay(chunkDelayMs);
              controller.enqueue({ type: "text-delta", id: "t1", delta: storyChunk(i) });
            }
            // A terminal stream failure mid-turn: the deterministic trigger
            // for the failed-turn notice / error rail state in both cockpits.
            controller.enqueue({
              type: "error",
              error: new Error("mock: injected mid-stream failure [mock:fail]"),
            });
            controller.close();
            return;
          }

          if (scenario === "burst") {
            controller.enqueue({ type: "text-start", id: "t1" });
            controller.enqueue({
              type: "text-delta",
              id: "t1",
              delta: `**Burst: ${burstChunks} deltas, no pacing.**\n\n`,
            });
            for (let i = 0; i < burstChunks; i++) {
              if (abortSignal?.aborted) break;
              controller.enqueue({
                type: "text-delta",
                id: "t1",
                delta: i % 8 === 0 ? `${storyChunk(i)} [¶${i / 8 + 1}]` : storyChunk(i),
              });
            }
            controller.enqueue({ type: "text-delta", id: "t1", delta: "\n\n**Burst done.**" });
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(burstChunks * 12),
            });
            controller.close();
            return;
          }

          if (scenario === "markdown") {
            controller.enqueue({ type: "text-start", id: "t1" });
            for (const chunk of markdownChunks()) {
              if (abortSignal?.aborted) break;
              await delay(Math.min(chunkDelayMs, 120));
              controller.enqueue({ type: "text-delta", id: "t1", delta: chunk });
            }
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(400),
            });
            controller.close();
            return;
          }

          if (scenario !== null) {
            const action = scriptActionFor(scenario, step, delegateToolName);
            // A short reasoning burst before each scripted step, so the
            // Thinking… display renders too.
            controller.enqueue({ type: "reasoning-start", id: "r1" });
            for (const word of `Scripted ${scenario} scenario, step ${step}: deciding the next move.`.split(" ")) {
              if (abortSignal?.aborted) break;
              await delay(chunkDelayMs);
              controller.enqueue({ type: "reasoning-delta", id: "r1", delta: `${word} ` });
            }
            controller.enqueue({ type: "reasoning-end", id: "r1" });

            if (action.kind === "tool-call") {
              const toolCallId = `mock-call-${scenario}-${step}`;
              const inputJson = JSON.stringify(action.input);
              controller.enqueue({ type: "tool-input-start", id: toolCallId, toolName: action.toolName });
              controller.enqueue({ type: "tool-input-delta", id: toolCallId, delta: inputJson });
              controller.enqueue({ type: "tool-input-end", id: toolCallId });
              controller.enqueue({
                type: "tool-call",
                toolCallId,
                toolName: action.toolName,
                input: inputJson,
              });
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "tool-calls", raw: "tool_use" },
                usage: usageFor(50),
              });
              controller.close();
              return;
            }
            controller.enqueue({ type: "text-start", id: "t1" });
            for (const word of action.text.split(" ")) {
              if (abortSignal?.aborted) break;
              await delay(chunkDelayMs);
              controller.enqueue({ type: "text-delta", id: "t1", delta: `${word} ` });
            }
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(action.text.length),
            });
            controller.close();
            return;
          }

          controller.enqueue({ type: "text-start", id: "t1" });
          controller.enqueue({
            type: "text-delta",
            id: "t1",
            delta: `**Story for: "${topic}…"**\n\n`,
          });
          for (let i = 0; i < chunkCount; i++) {
            if (abortSignal?.aborted) break;
            await delay(chunkDelayMs);
            controller.enqueue({
              type: "text-delta",
              id: "t1",
              delta:
                i % 8 === 0
                  ? `${storyChunk(i)} [${topic.slice(0, 12)}… ¶${i / 8 + 1}]`
                  : storyChunk(i),
            });
          }
          controller.enqueue({ type: "text-end", id: "t1" });
          controller.enqueue({
            type: "finish",
            finishReason: { unified: "stop", raw: "stop" },
            usage: usageFor(chunkCount * 12),
          });
          controller.close();
        },
      });
      return { stream };
    },
  };
}
