import { createExploreAgent, createMockStoryModel } from "@zocomputer/agent-sdk";

// The explore subagent: a read-only child the coder fans out for codebase
// questions (README: "Declare an explore subagent"). The model is pinned fast
// and cheap, independent of the parent — exploration stays cheap even when
// the parent runs the big model. The SDK default description carries the
// parent-facing routing guidance (read-only, parallel-safe, thoroughness).
//
// CODER_MOCK_MODEL=1 (the credential-free test mode — see agent/agent.ts)
// swaps the child onto the mock too: a delegated explore call would otherwise
// need a real gateway key mid-scenario. Kept short so the child settles fast.
export default createExploreAgent({
  model:
    process.env.CODER_MOCK_MODEL === "1"
      ? createMockStoryModel({ chunkCount: 24, chunkDelayMs: 100 })
      : "anthropic/claude-haiku-4.5",
  workspaceNoun: "project",
});
