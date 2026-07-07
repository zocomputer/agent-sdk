import {
  createMockStoryModel,
  createTaskAgent,
  STDLIB_EXTERNAL_DEPENDENCIES,
} from "@zocomputer/agent-sdk";

// The fast task tier: a full-capability copy of the coder pinned to a fast,
// cheap model. Eve has no per-call model parameter — a subagent's model
// compiles from this file — so the model knob is one declared subagent per
// tier: the parent picks a model by picking a tool, guided by this
// description. Add sibling dirs (task_deep/, …) for more tiers.
//
// The blurb comes from the AI Gateway model catalog (the same catalog the AI
// SDK's `gateway.getAvailableModels()` reads) and is CHECKED IN, never
// fetched here: tool descriptions are part of the cached prompt prefix and
// must be static and offline-safe. Refresh it with a one-shot script over
// `fetchGatewayModelCatalog` when the model changes.
export default createTaskAgent({
  model:
    process.env.CODER_MOCK_MODEL === "1"
      ? createMockStoryModel({ chunkCount: 24, chunkDelayMs: 100 })
      : "anthropic/claude-sonnet-5",
  modelName: "Claude Sonnet 5",
  modelBlurb:
    "Sonnet 5 is an upgrade to Sonnet 4.6, with gains across agentic coding and professional work. It builds on the strengths of previous Sonnet models, bringing top-tier intelligence at Sonnet pricing for coding, agents, and everyday professional work at scale.",
  use: "Prefer it for quick, well-scoped subtasks — exploration and how/where/what questions, mechanical edits, focused verification — where a fast, cheap model is enough.",
  capabilityNote:
    "Images it reads degrade to metadata — it reports paths instead of viewing pixels.",
  workspaceNoun: "project",
  // A declared subagent compiles with its own manifest config — the parent's
  // externalDependencies list doesn't reach it (see agent/agent.ts).
  build: { externalDependencies: [...STDLIB_EXTERNAL_DEPENDENCIES] },
});
