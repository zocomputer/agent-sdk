import { defineAgent } from "eve";
import { createMockStoryModel } from "@zocomputer/agent-sdk";

// A minimal coding agent built on @zocomputer/agent-sdk. Inference runs through
// eve's default Vercel AI Gateway — set AI_GATEWAY_API_KEY and pick any model
// slug. `reasoning` turns on extended thinking.
//
// A factory (not a plain object) on purpose: eve caches the bundled module by
// content hash, so a rebuild can serve this module's cached evaluation — but
// the compiler re-invokes a function export every compile pass, which keeps
// the env read fresh.
export default function agent() {
  // CODER_MOCK_MODEL=1 swaps in the SDK's scripted mock model: a
  // credential-free test rig where everything past the model call — session
  // routes, harness, framework tools, durable streams — runs real, and only
  // inference is canned. Drive it with `[mock:<scenario>]` directives (see the
  // README's "Mock model" section). Never set in a normal run.
  if (process.env.CODER_MOCK_MODEL === "1") {
    return defineAgent({ model: createMockStoryModel() });
  }
  return defineAgent({
    model: "anthropic/claude-opus-4.8",
    reasoning: "medium",
  });
}
