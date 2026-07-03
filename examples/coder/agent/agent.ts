import { defineAgent } from "eve";

// A minimal coding agent built on @zocomputer/agent-sdk. Inference runs through
// eve's default Vercel AI Gateway — set AI_GATEWAY_API_KEY and pick any model
// slug. `reasoning` turns on extended thinking.
export default defineAgent({
  model: "anthropic/claude-opus-4.8",
  reasoning: "medium",
});
