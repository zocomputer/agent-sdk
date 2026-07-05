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

/** A positive numeric env knob, or the fallback when unset/non-numeric. */
function envNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default function agent() {
  // CODER_MOCK_MODEL=1 swaps in the SDK's scripted mock model: a
  // credential-free test rig where everything past the model call — session
  // routes, harness, framework tools, subagents, durable streams — runs real,
  // and only inference is canned. Drive it with `[mock:<scenario>]` directives
  // (see the README's "Mock model" section); the evals-mock/ suite runs the
  // scenarios end-to-end via `bun run eval`. Never set in a normal run.
  if (process.env.CODER_MOCK_MODEL === "1") {
    return defineAgent({
      model: createMockStoryModel({
        chunkCount: envNumber("CODER_MOCK_CHUNKS", 240),
        chunkDelayMs: envNumber("CODER_MOCK_DELAY_MS", 250),
        burstChunks: envNumber("CODER_MOCK_BURST_CHUNKS", 600),
      }),
    });
  }
  return defineAgent({
    model: "anthropic/claude-opus-4.8",
    reasoning: "medium",
  });
}
