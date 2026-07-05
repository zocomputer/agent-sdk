import { defineEvalConfig } from "eve/evals";

// Config for the coder's DETERMINISTIC mock-model eval suite (run via
// `bun run eval`, which mounts this tree as an isolated app root's `evals/`
// and sets CODER_MOCK_MODEL=1 — see scripts/eval.ts). Everything past the
// model call runs REAL — session routes, harness, framework tools,
// park/resume, the explore subagent, durable streams — but inference is the
// SDK's scripted mock (`createMockStoryModel`), so the suite is
// credential-free, deterministic, and fast enough to gate CI. This is the
// SDK's end-to-end contract: the prescribed wiring in this example, driven
// through a real eve server.
//
// maxConcurrency stays 1: turns run against one local eval dev server, and
// parallel turns reset it mid-stream.
export default defineEvalConfig({
  timeoutMs: 60_000,
  maxConcurrency: 1,
});
