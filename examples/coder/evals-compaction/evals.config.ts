import { defineEvalConfig } from "eve/evals";

// Config for the FORCED-COMPACTION eval suite (run via `bun run
// eval:compaction`, which mounts this tree as an isolated app root's `evals/`
// with CODER_MOCK_MODEL=1, CODER_MOCK_WINDOW_TOKENS=256, and a
// CODER_COMPACTION_REPORT_FILE — see scripts/eval.ts). The tiny window makes
// eve's compaction fire between two ordinary turns, which is why these evals
// live apart from evals-mock: under a 256-token window every multi-turn mock
// eval would compact mid-flight.
//
// What this pins, end to end through a REAL eve server: eve compacts → the
// SDK's withValidatedCompaction judges the summary against the dropped
// transcript → repairs it in place when a planted fact went missing → the
// repaired summary reaches the next turn's prompt. Deterministic and
// credential-free (the mock model answers the compaction and judge calls —
// see the SDK's mock-model module), so it gates CI.
//
// maxConcurrency stays 1: turns run against one local eval dev server, and
// parallel turns reset it mid-stream.
export default defineEvalConfig({
  timeoutMs: 60_000,
  maxConcurrency: 1,
});
