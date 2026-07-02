import { z } from "zod";
import type { CommandRunner } from "./run";

// The set of operations run_async can launch in the background. This is the
// generic mechanism: run_async dispatches by name into this registry, so
// backgrounding "any tool" is a matter of registering it here — no bespoke
// per-tool async twin. Register only the ops where waiting actually hurts (a
// shell command); instant file ops stay synchronous, and mutating ops
// (edit/write) stay out to avoid the agent racing its own edits.

// A registered op erases its input type behind a uniform surface: `start`
// parses the raw tool input with the op's own schema (throwing a clear error on
// bad input) and returns a label plus the in-flight promise. The parse lives
// inside the closure, so the registry stays a plain array with no `any`.
export interface BackgroundableOp {
  readonly name: string;
  readonly description: string;
  /** JSON Schema of the op's input, surfaced so the model knows what to pass. */
  readonly inputJsonSchema: unknown;
  start(rawInput: unknown): { label: string; work: Promise<unknown>; progress?: () => unknown };
}

export function defineOp<I>(cfg: {
  name: string;
  description: string;
  inputSchema: z.ZodType<I>;
  label: (input: I) => string;
  run: (input: I) => Promise<unknown> | { work: Promise<unknown>; progress?: () => unknown };
}): BackgroundableOp {
  return {
    name: cfg.name,
    description: cfg.description,
    inputJsonSchema: z.toJSONSchema(cfg.inputSchema),
    start(rawInput) {
      const parsed = cfg.inputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new Error(`Invalid input for "${cfg.name}": ${parsed.error.message}`);
      }
      const started = cfg.run(parsed.data);
      if (started instanceof Promise) return { label: cfg.label(parsed.data), work: started };
      return { label: cfg.label(parsed.data), ...started };
    },
  };
}

function truncate(s: string, max = 80): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

// The one op every agent wants backgroundable: a shell command through the
// stdlib's runner. Agents with their own long-running ops append to the array
// this feeds (see createStdlib's `backgroundables`).
export function createBashOp(runner: CommandRunner): BackgroundableOp {
  return defineOp({
    name: "bash",
    description:
      "Run a shell command in the background (git, bun, tests, builds, installs, dev servers). Same as the bash tool, but non-blocking.",
    inputSchema: z.object({
      command: z.string().min(1),
      cwd: z.string().optional(),
      // Background work is meant to be long; default the kill timeout higher
      // than the synchronous bash tool's 120s.
      timeout_ms: z.number().int().positive().optional(),
    }),
    label: ({ command }) => truncate(command),
    run: ({ command, cwd, timeout_ms }) => {
      const running = runner.startCommand(command, { cwd, timeoutMs: timeout_ms ?? 600_000 });
      return { work: running.result, progress: running.progress };
    },
  });
}
