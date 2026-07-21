// ../../../../../tmp/agent-sdk-mirror-vM4zNa/repo/platform/runtime-ai/validated-compaction.ts
var COMPACTION_SENTINEL = "You are a conversation summarizer.";
var RECOVERED_CONTEXT_HEADER = "## Recovered context (compaction audit)";
// ../../../../../tmp/agent-sdk-mirror-vM4zNa/repo/src/mock-model.ts
var STORY_SENTENCES = [
  "The lighthouse keeper counted the waves as they broke against the rocks.",
  "Every seventh wave carried a whisper from the old town beneath the sea.",
  "Marisol had kept the light burning for forty-one years without a single dark night.",
  "Tonight the fog rolled in thicker than she had ever seen it.",
  "Somewhere out past the shoals, a bell rang that no ship had carried in decades.",
  "She climbed the spiral stairs slowly, lantern in one hand, logbook in the other.",
  "The glass at the top of the tower was cold and streaked with salt.",
  "Below, the sea moved like a great animal turning in its sleep.",
  "She wrote the date in the logbook and then paused, pen hovering.",
  "The bell rang again, closer now, and the fog pressed against the windows."
];
function storyChunk(index) {
  const sentence = STORY_SENTENCES[index % STORY_SENTENCES.length] ?? "The story went on.";
  const paragraphBreak = index > 0 && index % 8 === 0 ? `

` : " ";
  return `${paragraphBreak}${sentence}`;
}
var delay = (ms) => ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
function usageFor(outputTokens) {
  return {
    inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: outputTokens, text: outputTokens, reasoning: 0 }
  };
}
var MOCK_SCENARIOS = [
  "hitl",
  "parallel",
  "todo",
  "delegate",
  "fail",
  "burst",
  "markdown",
  "interleave",
  "empty",
  "recall"
];
function markdownChunks() {
  return [
    `## Streaming markdown stress

`,
    "A paragraph with **bold**, _italic_, `inline code`, and a [link](https://example.com).\n\n",
    "```ts\n",
    `export function keeper(light: number): string {
`,
    `  // the fence stays open across deltas
`,
    "  return `burning for ${light} years`;\n",
    `}
`,
    "```\n\n",
    `| tide | bell | fog |
`,
    `| --- | --- | --- |
`,
    `| low | quiet | thin |
`,
    `| high | ringing | thick |

`,
    `1. climb the stairs
`,
    `   - lantern in one hand
`,
    `   - logbook in the other
`,
    `2. write the date
`,
    `   1. pause, pen hovering
`,
    `   2. listen for the bell

`,
    `> The sea moved like a great animal turning in its sleep.

`,
    `Unicode: emoji \uD83C\uDF0A\uD83D\uDD14, CJK 灯台守は波を数えた, RTL مرحبا, combining é ñ ü.

`,
    "A very long unbroken token: " + "abcdefghij".repeat(40) + `

`,
    `Done. ✅
`
  ];
}
function mockScenarioFrom(text) {
  const match = /\[mock:([a-z]+)\]/.exec(text);
  const name = match?.[1];
  return MOCK_SCENARIOS.includes(name ?? "") ? name : null;
}
function scriptStepFrom(prompt) {
  let step = 0;
  for (const message of prompt) {
    if (message.role === "user")
      step = 0;
    else if (message.role === "tool") {
      step += message.content.filter((part) => part.type === "tool-result").length;
    }
  }
  return step;
}
function lastUserTextFrom(prompt) {
  return [...prompt].reverse().flatMap((message) => message.role === "user" ? message.content.flatMap((part) => part.type === "text" ? [part.text] : []) : [])[0];
}
function askQuestionCall(prompt, topic) {
  return {
    toolName: "ask_question",
    input: {
      prompt,
      options: [
        {
          id: "ship",
          label: `Ship the ${topic}`,
          style: "primary",
          description: "Proceed with the happy path."
        },
        { id: "hold", label: "Hold for review" },
        { id: "abort", label: "Abort the run", style: "danger", description: "Stops everything." }
      ],
      allowFreeform: true
    }
  };
}
function scriptActionFor(scenario, step, delegateToolName = "task_fast") {
  switch (scenario) {
    case "hitl":
      if (step === 0) {
        return {
          kind: "tool-calls",
          calls: [askQuestionCall("Mock HITL: how should this test proceed?", "change")]
        };
      }
      return { kind: "text", text: "Answer received — the mock turn resumed and finished cleanly." };
    case "parallel":
      if (step === 0) {
        return {
          kind: "tool-calls",
          calls: [
            askQuestionCall("Mock parallel HITL (1 of 2): which color?", "color"),
            askQuestionCall("Mock parallel HITL (2 of 2): which size?", "size")
          ]
        };
      }
      if (step === 1) {
        return {
          kind: "text",
          text: "Only one answer arrived — the parallel HITL scenario ended without the second."
        };
      }
      return {
        kind: "text",
        text: "Both answers received — the parallel HITL scenario finished cleanly."
      };
    case "todo":
      if (step === 0) {
        return {
          kind: "tool-calls",
          calls: [
            {
              toolName: "todo",
              input: {
                todos: [
                  { content: "Survey the harbor charts", status: "completed", priority: "high" },
                  { content: "Polish the tower glass", status: "in_progress", priority: "medium" },
                  { content: "Refill the oil reserves", status: "pending", priority: "medium" },
                  { content: "Log the evening tide", status: "pending", priority: "low" }
                ]
              }
            }
          ]
        };
      }
      if (step === 1) {
        return {
          kind: "tool-calls",
          calls: [
            {
              toolName: "todo",
              input: {
                todos: [
                  { content: "Survey the harbor charts", status: "completed", priority: "high" },
                  { content: "Polish the tower glass", status: "completed", priority: "medium" },
                  { content: "Refill the oil reserves", status: "in_progress", priority: "medium" },
                  { content: "Log the evening tide", status: "cancelled", priority: "low" }
                ]
              }
            }
          ]
        };
      }
      return { kind: "text", text: "Todo list written and updated — checklist scenario complete." };
    case "delegate":
      if (step === 0) {
        return {
          kind: "tool-calls",
          calls: [
            {
              toolName: delegateToolName,
              input: {
                message: "Mock delegation: describe the lighthouse keeper's routine. Reply with a short report."
              }
            }
          ]
        };
      }
      return { kind: "text", text: "The delegate reported back — delegation scenario complete." };
  }
}
function toolInputFragments(inputJson, fragmentSize = 24) {
  if (inputJson.length === 0)
    return [];
  const fragments = [];
  for (let i = 0;i < inputJson.length; i += fragmentSize) {
    fragments.push(inputJson.slice(i, i + fragmentSize));
  }
  return fragments;
}
var MOCK_JUDGE_PROMPT_OPENING = "You audit conversation summaries for information loss.";
var MOCK_COMPACTION_SUMMARY = "Goal: continue the mock conversation. Accomplished: the assistant streamed deterministic story turns. Next steps: keep replying in mock mode.";
function plantedFactTokens(text) {
  return [...text.matchAll(/\[fact:([A-Za-z0-9-]+)\]/g)].flatMap((match) => match[1] !== undefined && match[1] !== "" ? [match[1]] : []);
}
function userTextFrom(prompt) {
  const chunks = [];
  for (const message of prompt) {
    if (message.role !== "user")
      continue;
    for (const part of message.content) {
      if (part.type === "text")
        chunks.push(part.text);
    }
  }
  return chunks.join(`

`);
}
function mockGenerateReply(prompt) {
  const first = prompt[0];
  const system = first !== undefined && first.role === "system" ? first.content : undefined;
  if (system?.startsWith(COMPACTION_SENTINEL) === true)
    return MOCK_COMPACTION_SUMMARY;
  if (system?.startsWith(MOCK_JUDGE_PROMPT_OPENING) === true) {
    const tokens = plantedFactTokens(userTextFrom(prompt));
    if (tokens.length === 0)
      return "NOTHING MISSING";
    return tokens.map((token) => `- The planted fact token ${token} must be preserved verbatim.`).join(`
`);
  }
  return "(mock model, non-streaming reply)";
}
function recallReply(prompt) {
  for (const message of prompt) {
    if (message.role !== "assistant" && message.role !== "user")
      continue;
    for (const part of message.content) {
      if (part.type !== "text")
        continue;
      const index = part.text.indexOf(RECOVERED_CONTEXT_HEADER);
      if (index !== -1) {
        return `Recovered context found in the prompt:

${part.text.slice(index)}`;
      }
    }
  }
  return "No recovered context in the prompt.";
}
function createMockStoryModel(options = {}) {
  const chunkCount = options.chunkCount ?? 240;
  const chunkDelayMs = options.chunkDelayMs ?? 250;
  const burstChunks = options.burstChunks ?? 600;
  const delegateToolName = options.delegateToolName ?? "task_fast";
  const now = options.now ?? Date.now;
  return {
    specificationVersion: "v4",
    provider: "anthropic",
    modelId: "claude-opus-4-8",
    supportedUrls: {},
    async doGenerate(callOptions) {
      const text = mockGenerateReply(callOptions.prompt);
      return {
        content: [{ type: "text", text }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: usageFor(Math.ceil(text.length / 4)),
        warnings: []
      };
    },
    async doStream(callOptions) {
      const abortSignal = callOptions.abortSignal;
      const lastUserText = lastUserTextFrom(callOptions.prompt);
      const scenario = mockScenarioFrom(lastUserText ?? "");
      const step = scriptStepFrom(callOptions.prompt);
      const topic = (lastUserText ?? "an untitled request").slice(0, 60);
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue({ type: "stream-start", warnings: [] });
          controller.enqueue({
            type: "response-metadata",
            id: `mock-${now()}`,
            modelId: "claude-opus-4-8",
            timestamp: new Date(now())
          });
          if (scenario === "fail") {
            controller.enqueue({ type: "text-start", id: "t1" });
            for (let i = 0;i < 6; i++) {
              if (abortSignal?.aborted)
                break;
              await delay(chunkDelayMs);
              controller.enqueue({ type: "text-delta", id: "t1", delta: storyChunk(i) });
            }
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "error",
              error: new Error("mock: injected mid-stream failure [mock:fail]")
            });
            controller.close();
            return;
          }
          if (scenario === "burst") {
            controller.enqueue({ type: "text-start", id: "t1" });
            controller.enqueue({
              type: "text-delta",
              id: "t1",
              delta: `**Burst: ${burstChunks} deltas, no pacing.**

`
            });
            for (let i = 0;i < burstChunks; i++) {
              if (abortSignal?.aborted)
                break;
              controller.enqueue({
                type: "text-delta",
                id: "t1",
                delta: i % 8 === 0 ? `${storyChunk(i)} [¶${i / 8 + 1}]` : storyChunk(i)
              });
            }
            controller.enqueue({ type: "text-delta", id: "t1", delta: `

**Burst done.**` });
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(burstChunks * 12)
            });
            controller.close();
            return;
          }
          if (scenario === "markdown") {
            controller.enqueue({ type: "text-start", id: "t1" });
            for (const chunk of markdownChunks()) {
              if (abortSignal?.aborted)
                break;
              await delay(Math.min(chunkDelayMs, 120));
              controller.enqueue({ type: "text-delta", id: "t1", delta: chunk });
            }
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(400)
            });
            controller.close();
            return;
          }
          if (scenario === "interleave") {
            const blocks = [
              {
                kind: "reasoning",
                id: "r1",
                text: "First thought: check the tide tables before anything else."
              },
              {
                kind: "text",
                id: "t1",
                text: `The tide tables say low water at dusk.

That changes the plan.`
              },
              {
                kind: "reasoning",
                id: "r2",
                text: "Second thought: the bell only rings when the fog is thick."
              },
              {
                kind: "text",
                id: "t2",
                text: "So the keeper waits for the bell — interleave scenario complete."
              }
            ];
            for (const block of blocks) {
              const startType = block.kind === "reasoning" ? "reasoning-start" : "text-start";
              const deltaType = block.kind === "reasoning" ? "reasoning-delta" : "text-delta";
              const endType = block.kind === "reasoning" ? "reasoning-end" : "text-end";
              controller.enqueue({ type: startType, id: block.id });
              for (const word of block.text.split(" ")) {
                if (abortSignal?.aborted)
                  break;
                await delay(Math.min(chunkDelayMs, 80));
                controller.enqueue({ type: deltaType, id: block.id, delta: `${word} ` });
              }
              controller.enqueue({ type: endType, id: block.id });
              if (abortSignal?.aborted)
                break;
            }
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(120)
            });
            controller.close();
            return;
          }
          if (scenario === "recall") {
            const reply = recallReply(callOptions.prompt);
            controller.enqueue({ type: "text-start", id: "t1" });
            for (const word of reply.split(" ")) {
              if (abortSignal?.aborted)
                break;
              await delay(Math.min(chunkDelayMs, 40));
              controller.enqueue({ type: "text-delta", id: "t1", delta: `${word} ` });
            }
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(reply.length)
            });
            controller.close();
            return;
          }
          if (scenario === "empty") {
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(0)
            });
            controller.close();
            return;
          }
          if (scenario !== null) {
            const action = scriptActionFor(scenario, step, delegateToolName);
            controller.enqueue({ type: "reasoning-start", id: "r1" });
            for (const word of `Scripted ${scenario} scenario, step ${step}: deciding the next move.`.split(" ")) {
              if (abortSignal?.aborted)
                break;
              await delay(chunkDelayMs);
              controller.enqueue({ type: "reasoning-delta", id: "r1", delta: `${word} ` });
            }
            controller.enqueue({ type: "reasoning-end", id: "r1" });
            if (action.kind === "tool-calls") {
              for (const [callIndex, call] of action.calls.entries()) {
                const toolCallId = `mock-call-${scenario}-${step}-${callIndex}`;
                const inputJson = JSON.stringify(call.input);
                controller.enqueue({
                  type: "tool-input-start",
                  id: toolCallId,
                  toolName: call.toolName
                });
                for (const fragment of toolInputFragments(inputJson)) {
                  if (abortSignal?.aborted)
                    break;
                  await delay(Math.min(chunkDelayMs, 80));
                  controller.enqueue({ type: "tool-input-delta", id: toolCallId, delta: fragment });
                }
                controller.enqueue({ type: "tool-input-end", id: toolCallId });
                controller.enqueue({
                  type: "tool-call",
                  toolCallId,
                  toolName: call.toolName,
                  input: inputJson
                });
              }
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "tool-calls", raw: "tool_use" },
                usage: usageFor(50 * action.calls.length)
              });
              controller.close();
              return;
            }
            controller.enqueue({ type: "text-start", id: "t1" });
            for (const word of action.text.split(" ")) {
              if (abortSignal?.aborted)
                break;
              await delay(chunkDelayMs);
              controller.enqueue({ type: "text-delta", id: "t1", delta: `${word} ` });
            }
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(action.text.length)
            });
            controller.close();
            return;
          }
          controller.enqueue({ type: "text-start", id: "t1" });
          controller.enqueue({
            type: "text-delta",
            id: "t1",
            delta: `**Story for: "${topic}…"**

`
          });
          for (let i = 0;i < chunkCount; i++) {
            if (abortSignal?.aborted)
              break;
            await delay(chunkDelayMs);
            controller.enqueue({
              type: "text-delta",
              id: "t1",
              delta: i % 8 === 0 ? `${storyChunk(i)} [${topic.slice(0, 12)}… ¶${i / 8 + 1}]` : storyChunk(i)
            });
          }
          controller.enqueue({ type: "text-end", id: "t1" });
          controller.enqueue({
            type: "finish",
            finishReason: { unified: "stop", raw: "stop" },
            usage: usageFor(chunkCount * 12)
          });
          controller.close();
        }
      });
      return { stream };
    }
  };
}
export {
  toolInputFragments,
  scriptStepFrom,
  scriptActionFor,
  mockScenarioFrom,
  markdownChunks,
  lastUserTextFrom,
  createMockStoryModel,
  MOCK_SCENARIOS
};
