import { z } from "zod";
import type { CommandRunner, CommandRunnerProvider } from "./run";
import type { IoToolContext } from "./workspace-io";

// The set of operations run_async can launch in the background. This is the
// generic mechanism: run_async dispatches by name into this registry, so
// backgrounding "any tool" is a matter of registering it here — no bespoke
// per-tool async twin. Register only the ops where waiting actually hurts (a
// shell command); instant file ops stay synchronous, and mutating ops
// (edit/write) stay out to avoid the agent racing its own edits.

/** Optional live handles run_async threads into an op (e.g. a watcher tap). */
export interface OpStartExtras {
  /** Raw output tap; an op that produces no stream just ignores it. */
  onOutput?: (chunk: string) => void;
  /**
   * The calling tool's context, for ops whose backend resolves per call
   * (the sandbox command runner reads `ctx.getSandbox()`). Ops with a fixed
   * backend ignore it.
   */
  ctx?: IoToolContext | undefined;
}

/**
 * A registered operation run_async can launch in the background: uniform
 * surface over any input type. `start` parses the raw tool input with the
 * op's own schema (throwing a clear error on bad input) and returns a label
 * plus the in-flight promise, with optional progress tap.
 */
export interface BackgroundableOp {
  readonly name: string;
  readonly description: string;
  /** JSON Schema of the op's input, surfaced so the model knows what to pass. */
  readonly inputJsonSchema: unknown;
  /**
   * Parse input and start the operation. Returns a user-facing label, the
   * in-flight work promise, and optionally a progress tap that reads the
   * op's current state (e.g. accumulated output, task count).
   */
  start(
    rawInput: unknown,
    extras?: OpStartExtras,
  ): {
    label: string;
    work: Promise<unknown>;
    /** Optional tap that reads the op's current state (e.g. accumulated output, task count). */
    progress?: () => unknown;
  };
}

/**
 * Define a backgroundable operation: typed input schema, label builder, and
 * the work function. The returned `BackgroundableOp` erases the input type
 * behind a uniform surface so the registry stays a plain array with no `any`.
 */
export function defineOp<I>(cfg: {
  name: string;
  description: string;
  inputSchema: z.ZodType<I>;
  label: (input: I) => string;
  run: (
    input: I,
    extras?: OpStartExtras,
  ) => Promise<unknown> | { work: Promise<unknown>; progress?: () => unknown };
}): BackgroundableOp {
  return {
    name: cfg.name,
    description: cfg.description,
    inputJsonSchema: z.toJSONSchema(cfg.inputSchema),
    start(rawInput, extras) {
      const parsed = cfg.inputSchema.safeParse(rawInput);
      if (!parsed.success) {
        // prettifyError, not error.message (a JSON issue dump): the model
        // reads this verbatim and corrects the named fields on the resend.
        throw new Error(
          `Invalid input for "${cfg.name}" — nothing was started. Fix the input to match the tool's schema (shown in the run_async catalog) and resend.\n${z.prettifyError(parsed.error)}`,
        );
      }
      const started = cfg.run(parsed.data, extras);
      if (started instanceof Promise) return { label: cfg.label(parsed.data), work: started };
      return { label: cfg.label(parsed.data), ...started };
    },
  };
}

function truncate(s: string, max = 80): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

/**
 * Build the bash backgroundable op: a shell command through the stdlib's
 * runner. The one op every agent wants backgroundable; agents with their own
 * long-running ops append to the array this feeds.
 */
export function createBashOp(runner: CommandRunner | CommandRunnerProvider): BackgroundableOp {
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
    run: ({ command, cwd, timeout_ms }, extras) => {
      const resolved = typeof runner === "function" ? runner(extras?.ctx) : runner;
      const running = resolved.startCommand(command, {
        cwd,
        timeoutMs: timeout_ms ?? 600_000,
        onOutput: extras?.onOutput,
      });
      return { work: running.result, progress: running.progress };
    },
  });
}
