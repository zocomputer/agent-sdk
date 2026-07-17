import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTaskRegistry, type TaskRegistry } from "./async-tasks";
import { createBashOp, type BackgroundableOp } from "./backgroundable";
import { createDirConventionsTracker } from "./dir-conventions";
import {
  createCommunicationInstruction,
  createHitlInstruction,
  createInstructionStackInstruction,
  createLookInstruction,
  createParallelToolsInstruction,
  createPlanningInstruction,
  createSubagentInstruction,
  createWorkflowInstruction,
  type InstructionStackSectionId,
  type SubagentRosterEntry,
} from "./instructions";
import type { InstructionTier, PlacedPromptSection } from "./prompt-sections";
import type { ModelInputCapabilities } from "./model-capabilities";
import { createBashTool } from "./tools/bash";
import { createEditTool } from "./tools/edit";
import { createGlobTool } from "./tools/glob";
import { createGrepTool } from "./tools/grep";
import {
  createLookTool,
  lookFetchedImageHint,
  lookFetchedMediaHint,
  lookOversizeHint,
  lookReadImageHint,
  lookReadMediaHint,
  resolveMediaOracle,
  type LookOracleConfig,
  type MediaOracleOption,
} from "./tools/look";
import { createReadTool } from "./tools/read";
import { createTasksTools } from "./tools/tasks";
import { createTodoTool } from "./tools/todo";
import { createWebFetchTool } from "./tools/webfetch";
import { createWriteTool } from "./tools/write";
import { createWorkspace } from "./workspace";
import { sandboxIoProvider, type SandboxIoOptions } from "./sandbox-io";
import { sandboxRunnerProvider } from "./sandbox-run";

// Hosted-first composition: every effect resolves the calling session's
// sandbox instead of assuming the eve process shares the workspace filesystem.

// The sandbox-backed counterpart to the stdlib's toolset, for the hosted
// topology: the eve process runs on one machine (a Vercel Function) and the
// workspace lives in the session's sandbox (`ctx.getSandbox()`) on another.
// The stdlib's `node:fs` tools would read the harness's own disk there — the
// wrong filesystem entirely — so these route every effect through the
// sandbox session instead: file tools over its file API (see ./sandbox-io.ts),
// bash over its `spawn` (see ./sandbox-run.ts), with the same auto-
// backgrounding and run_async/check_tasks/await_task machinery as the stdlib.
// Consumers wire them exactly like stdlib tools (one `agent/tools/<name>.ts`
// re-export each) and vacate eve's built-ins with disable shims.
//

/**
 * Options for the sandbox file tools: workspace root (inside the sandbox),
 * display noun, session resolver, spill dir, attachment/media settings, and
 * the instruction-stack knobs (tier, omit/extra sections, verify hint,
 * subagent roster).
 */
export interface SandboxFileToolsOptions {
  /**
   * Absolute workspace root **inside the sandbox** (e.g. "/workspace").
   * File tools refuse paths that escape it.
   */
  workspaceRoot: string;
  /** What tool descriptions call the workspace. Defaults to "workspace". */
  workspaceNoun?: string;
  /**
   * Resolves the sandbox session for one tool call. Defaults to
   * `ctx.getSandbox()`; injectable for tests.
   */
  resolveSession?: SandboxIoOptions["resolveSession"];
  /**
   * Sandbox directory for oversized tool output: grep's overflow match lists
   * and bash's truncated command output (both spilled through the sandbox, so
   * the model's follow-up `read` can reach them). Omit to keep grep's
   * stop-at-cap behavior and bash's label-less truncation markers.
   */
  spillDir?: string;
  /**
   * Path **on the harness's local disk** for the background-task store
   * (task metadata + completed results, surviving an agent restart).
   * Defaults to a per-process path under the OS temp dir — fine for
   * serverless, where the store's lifetime matches the instance anyway;
   * agents on durable hosts pass a real state path. Keep it outside any
   * model-readable workspace and give it one active writer; this registry is
   * restart persistence, not a multi-process job coordinator.
   */
  taskStorePath?: string;
  /** Extra prompt text for interactive-command guidance. */
  bashInteractiveHint?: string;
  /** Whether reads inject per-directory conventions. Defaults to `true`. */
  injectDirConventions?: boolean;
  /** Per-directory conventions filename. Defaults to "AGENTS.md". */
  conventionsFileName?: string;
  /**
   * Media-oracle configuration. The sandbox `look` reads bytes
   * through the sandbox session, so the oracle sees the session workspace's
   * files. Hosted Zo deployments pass `headers: { "x-zo-tool": "look" }` on
   * the config so the runtime proxy labels the tool's own model traffic.
   */
  mediaOracle?: MediaOracleOption;
  /**
   * The parent model's media input capabilities. This informs the stack's
   * media section (which kinds to view natively versus delegate).
   */
  parentCapabilities?: ModelInputCapabilities;
  /** Optional verification-command guidance for the workflow instruction. */
  verifyCommandHint?: string;
  /** Declared subagents and their routing guidance. */
  subagentRoster?: readonly SubagentRosterEntry[];
  /** Instruction depth. */
  instructionTier?: InstructionTier;
  /**
   * Further baseline sections `instructions.stack` should drop, by id — on
   * top of the sandbox topology's own omissions (see the `stack` doc on the
   * return value).
   */
  omitInstructionSections?: readonly InstructionStackSectionId[];
  /** Consumer sections to place into the composed instruction stack. */
  extraInstructionSections?:
    | readonly PlacedPromptSection[]
    | (() => readonly PlacedPromptSection[]);
}

/**
 * Create the sandbox-backed toolset for hosted agents:
 * read/edit/write/glob/grep route through the sandbox session's file API and
 * bash through its `spawn` — instead of the harness's local disk and shell —
 * plus the stdlib's background-task tools (run_async/check_tasks/await_task)
 * over the same registry machinery. Returns the workspace, IO provider, the
 * tools, and a pre-configured `instructions.stack` (the composed baseline
 * prompt, minus the sections that don't apply to this topology — see its doc).
 */
export function createSandboxFileTools(options: SandboxFileToolsOptions) {
  const noun = options.workspaceNoun ?? "workspace";
  const workspace = createWorkspace(options.workspaceRoot);
  const io = sandboxIoProvider({
    root: workspace.root,
    ...(options.resolveSession !== undefined
      ? { resolveSession: options.resolveSession }
      : {}),
  });
  const runner = sandboxRunnerProvider({
    root: workspace.root,
    ...(options.resolveSession !== undefined
      ? { resolveSession: options.resolveSession }
      : {}),
    spillDir: options.spillDir,
  });
  const registry: TaskRegistry = createTaskRegistry({
    storePath:
      options.taskStorePath ??
      join(tmpdir(), "agent-sdk", `sandbox-tasks-${process.pid}.json`),
  });
  const backgroundables: readonly BackgroundableOp[] = [createBashOp(runner)];
  const conventionsFileName = options.conventionsFileName ?? "AGENTS.md";
  const dirConventions =
    (options.injectDirConventions ?? true)
      ? {
          tracker: createDirConventionsTracker({
            workspaceRoot: workspace.root,
            fileName: conventionsFileName,
          }),
          fileName: conventionsFileName,
        }
      : undefined;
  const oracle: LookOracleConfig | null =
    options.mediaOracle !== undefined ? resolveMediaOracle(options.mediaOracle) : null;
  const readImageHint = oracle ? lookReadImageHint(oracle) : undefined;
  const readMediaHint = oracle ? lookReadMediaHint(oracle) : undefined;
  const readOversizeHint = oracle ? lookOversizeHint(oracle) : undefined;
  const fetchedImageHint = oracle ? lookFetchedImageHint(oracle) : undefined;
  const fetchedMediaHint = oracle ? lookFetchedMediaHint(oracle) : undefined;
  return {
    workspace,
    io,
    /** The sandbox-backed command runner provider behind `bash`/`run_async`. */
    runner,
    /** The background-task registry behind `bash` auto-backgrounding and the task tools. */
    registry,
    /** The run_async-able ops (bash). */
    backgroundables,
    /** The resolved look oracle (`null` when `mediaOracle` wasn't set) — same contract as `Stdlib.mediaOracle`. */
    mediaOracle: oracle,
    tools: {
      read: createReadTool({
        workspace,
        noun,
        io,
        dirConventions,
        ...(readImageHint !== undefined
          ? { imageUnavailableHint: readImageHint }
          : {}),
        ...(readMediaHint !== undefined
          ? { mediaUnavailableHint: readMediaHint }
          : {}),
        ...(readOversizeHint !== undefined ? { oversizeHint: readOversizeHint } : {}),
      }),
      edit: createEditTool({ workspace, noun, io }),
      write: createWriteTool({ workspace, noun, io }),
      glob: createGlobTool({ workspace, noun, io }),
      grep: createGrepTool({
        workspace,
        noun,
        io,
        ...(options.spillDir !== undefined ? { spillDir: options.spillDir } : {}),
      }),
      bash: createBashTool({
        workdir: workspace.root,
        runner,
        registry,
        noun,
        interactiveHint: options.bashInteractiveHint,
        execEnv: "sandbox",
      }),
      tasks: createTasksTools({ registry, backgroundables }),
      todo: createTodoTool(),
      webfetch: createWebFetchTool({
        workspace,
        ...(fetchedImageHint !== undefined
          ? { imageUnavailableHint: fetchedImageHint }
          : {}),
        ...(fetchedMediaHint !== undefined
          ? { mediaUnavailableHint: fetchedMediaHint }
          : {}),
      }),
      ...(oracle !== null ? { look: createLookTool({ workspace, noun, oracle, io }) } : {}),
    },
    instructions: {
      /**
       * The composed instruction stack (see
       * `createInstructionStackInstruction`), pre-configured for the sandbox
       * topology: no repo-conventions section (the workspace isn't on this
       * process's disk and instruction resolvers have no sandbox access —
       * nested conventions ride the read tool's dir-conventions riders
       * instead). The rest of the baseline — workflow,
       * planning, subagents, media (when the oracle is wired), hitl,
       * communication — targets eve's framework tools plus this toolset.
       * Honors `instructionTier`, `omitInstructionSections`, and
       * `extraInstructionSections`.
       */
      stack: createInstructionStackInstruction({
        tier: options.instructionTier,
        workspaceNoun: noun,
        verifyCommandHint: options.verifyCommandHint,
        subagentRoster: options.subagentRoster,
        media: oracle
          ? {
              modelName: oracle.modelName,
              capabilities: oracle.capabilities,
              parentCapabilities: options.parentCapabilities,
            }
          : undefined,
        omitSections: options.omitInstructionSections,
        extraSections: options.extraInstructionSections,
      }),
      parallelTools: createParallelToolsInstruction({ tier: options.instructionTier }),
      subagents: createSubagentInstruction({
        workspaceNoun: noun,
        roster: options.subagentRoster,
        tier: options.instructionTier,
      }),
      ...(oracle !== null
        ? {
            media: createLookInstruction({
              modelName: oracle.modelName,
              capabilities: oracle.capabilities,
              parentCapabilities: options.parentCapabilities,
              tier: options.instructionTier,
            }),
          }
        : {}),
      workflow: createWorkflowInstruction({
        workspaceNoun: noun,
        verifyCommandHint: options.verifyCommandHint,
        tier: options.instructionTier,
      }),
      planning: createPlanningInstruction({ tier: options.instructionTier }),
      communication: createCommunicationInstruction({ tier: options.instructionTier }),
      hitl: createHitlInstruction({ tier: options.instructionTier }),
    },
  };
}

/**
 * The sandbox file tools return type: workspace, IO provider, runner,
 * registry, backgroundables, tools (read/edit/write/glob/grep/bash, tasks,
 * todo, webfetch, and optional look), and hosted-safe instructions.
 */
export type SandboxFileTools = ReturnType<typeof createSandboxFileTools>;

// À la carte surface: the tool/instruction factories and every lib module the
// tools are built from, for agents that compose their own set.
export { createBashTool, type BashExecEnv } from "./tools/bash";
export { createEditTool } from "./tools/edit";
export { createGlobTool } from "./tools/glob";
export { createGrepTool, type GrepResult } from "./tools/grep";
export {
  createLookTool,
  DEFAULT_LOOK_MAX_INPUT_BYTES,
  DEFAULT_LOOK_TIMEOUT_MS,
  DEFAULT_MEDIA_ORACLE,
  LOOK_MAX_ANSWER_CHARS,
  lookAvKindClause,
  lookFetchedImageHint,
  lookFetchedMediaHint,
  lookOversizeHint,
  lookReadImageHint,
  lookReadMediaHint,
  resolveMediaOracle,
  type LookGenerateFn,
  type LookOracleConfig,
  type LookToolOptions,
  type MediaOracleOption,
} from "./tools/look";
export { createReadTool } from "./tools/read";
export { buildTasksToolset, createTasksTools } from "./tools/tasks";
export { createTodoTool } from "./tools/todo";
export {
  createWebFetchTool,
  DEFAULT_MAX_INLINE_CONTENT_CHARS,
} from "./tools/webfetch";
export { createWriteTool } from "./tools/write";

export * from "./async-tasks";
export * from "./backgroundable";
export * from "./bounded-output";
export * from "./build-externals";
export * from "./dir-conventions";
export * from "./edit-match";
export * from "./task";
export * from "./todo-discipline";
export * from "./extract/cache";
export * from "./extract/docx";
export * from "./extract/epub";
export * from "./extract/ipynb";
export * from "./extract/odf";
export * from "./extract/pdf";
export * from "./extract/pptx";
export * from "./extract/rtf";
export * from "./extract/sheet";
export * from "./extract/zip";
export * from "./file-kind";
export * from "./file-view";
export * from "./glob-match";
export * from "./harness-protocol-v1";
export * from "./web-fetch";
export * from "./instructions";
export * from "./list-files";
export * from "./model-capabilities";
export * from "./prompt-sections";
export * from "./read-file-content";
export * from "./read-text";
export * from "./run";
export * from "./sandbox-io";
export * from "./sandbox-run";
export * from "./visible-reasoning";
export * from "./walk";
export * from "./workspace";
export * from "./workspace-io";
