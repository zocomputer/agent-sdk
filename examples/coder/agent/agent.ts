import { appendFileSync } from "node:fs";
import { defineAgent } from "eve";
import {
  createMockStoryModel,
  STDLIB_EXTERNAL_DEPENDENCIES,
  visibleReasoningModelOptions,
} from "@zocomputer/agent-sdk";
import { withValidatedCompaction } from "@zocomputer/agent-sdk/validated-compaction";

// Keep the SDK's dependency graph out of every authored-module bundle — eve
// compiles each tool/hook/instruction separately, and inlining xlsx/mammoth/
// linkedom into each one is the dominant cost of a cold compile. Packaging
// only; the same modules load from node_modules at run time.
const build = { externalDependencies: [...STDLIB_EXTERNAL_DEPENDENCIES] };

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
  // (see the GUIDE's "Mock model" section); the evals-mock/ suite runs the
  // scenarios end-to-end via `bun run eval`. Never set in a normal run.
  if (process.env.CODER_MOCK_MODEL === "1") {
    // CODER_MOCK_WINDOW_TOKENS shrinks the context window so eve's compaction
    // fires within a two-turn eval (the evals-compaction suite sets 256);
    // CODER_COMPACTION_REPORT_FILE makes the validation verdicts observable —
    // each CompactionValidationReport appends as one NDJSON line the eval
    // asserts on. Both unset in a normal mock run.
    const windowTokens = envNumber("CODER_MOCK_WINDOW_TOKENS", 0);
    const reportFile = process.env.CODER_COMPACTION_REPORT_FILE;
    return defineAgent({
      // Wrapped in withValidatedCompaction so the mock path exercises the
      // real judge-and-repair facade: the mock's doGenerate answers both the
      // compaction call and the judge call deterministically (see the SDK's
      // mock-model module), and `[mock:recall]` echoes any recovered-context
      // section back in-band.
      model: withValidatedCompaction(
        createMockStoryModel({
          chunkCount: envNumber("CODER_MOCK_CHUNKS", 240),
          chunkDelayMs: envNumber("CODER_MOCK_DELAY_MS", 250),
          burstChunks: envNumber("CODER_MOCK_BURST_CHUNKS", 600),
        }),
        reportFile === undefined || reportFile === ""
          ? {}
          : {
              onValidation: (report) => {
                appendFileSync(reportFile, `${JSON.stringify(report)}\n`);
              },
            },
      ),
      // The wrapped model is a LanguageModelV4 instance, not a catalog slug,
      // so eve can't auto-resolve its context window — but the mock borrows a
      // real catalog identity (anthropic/claude-sonnet-4-6), which eve still
      // resolves. Only override when the eval asks for a tiny window.
      ...(windowTokens > 0 ? { modelContextWindowTokens: windowTokens } : {}),
      build,
    });
  }
  // A bare catalog slug on purpose: eve's gateway-auto path resolves the
  // context window and enables prompt caching from a string id, both of which
  // a wrapped model instance forfeits. To add validated compaction to a live
  // agent, wrap a gateway instance and set modelContextWindowTokens explicitly
  // — see the GUIDE's "Validated compaction" section.
  const model = "anthropic/claude-opus-4.8";
  // Opus 4.8's thinking arrives encrypted (empty reasoning deltas) without
  // these provider options — reasoning happens but no "Thinking…" text ever
  // streams. See the SDK's visible-reasoning module.
  const modelOptions = visibleReasoningModelOptions(model);
  return defineAgent({
    model,
    reasoning: "medium",
    ...(modelOptions ? { modelOptions } : {}),
    build,
  });
}
