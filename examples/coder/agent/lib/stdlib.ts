import { resolve } from "node:path";
import { createStdlib } from "@zocomputer/agent-sdk";

// The coder works on your real filesystem, rooted here. Point CODER_WORKDIR at
// a project to code in; it defaults to wherever you launch the agent.
export const WORKDIR = resolve(process.env.CODER_WORKDIR ?? process.cwd());

// One stdlib instance for the whole agent. Each agent/tools/<name>.ts file
// re-exports one tool from here (the filename is the wire name the model sees).
export const stdlib = createStdlib({
  workspaceRoot: WORKDIR,
  stateDir: resolve(WORKDIR, ".coder"), // tasks.json + spilled tool output
  workspaceNoun: "project",
  // The media oracle: `look` delegates one question about a media file to
  // the SDK's default capable model (Gemini 3 Flash) when the coder's own
  // model can't view it. The slug resolves through the AI SDK's default
  // gateway provider on AI_GATEWAY_API_KEY; the mock e2e suite never calls
  // it, so the credential-free CI runs stay credential-free.
  mediaOracle: true,
  // Teaches the parent when to route to the declared task tier
  // (agent/subagents/task_fast/) instead of the clone `agent` tool.
  subagentRoster: [
    {
      name: "task_fast",
      when: "quick, well-scoped subtasks — exploration, focused questions, mechanical edits — on a fast, cheap model",
    },
  ],
});
