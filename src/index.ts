import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTaskRegistry, type TaskRegistry } from "./async-tasks";
import { createBashOp, type BackgroundableOp } from "./backgroundable";
import { TOOL_OUTPUT_DIRNAME } from "./bounded-output";
import { createDirConventionsTracker } from "./dir-conventions";
import {
  createCommunicationInstruction,
  createHitlInstruction,
  createInstructionStackInstruction,
  createLookInstruction,
  createParallelToolsInstruction,
  createPlanningInstruction,
  createRepoConventionsInstruction,
  createSubagentInstruction,
  createWorkflowInstruction,
  type InstructionStackSectionId,
  type SubagentRosterEntry,
} from "./instructions";
import type { InstructionTier, PlacedPromptSection } from "./prompt-sections";
import type { ModelInputCapabilities } from "./model-capabilities";
import { createCommandRunner, type CommandRunner } from "./run";
import { createSteerInbox, type SteerInbox } from "./steer-inbox";
import { createSteerWrapper } from "./steer-tool";
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
import { createWorkspace, type Workspace } from "./workspace";
import { sandboxIoProvider, type SandboxIoOptions } from "./sandbox-io";
import { sandboxRunnerProvider } from "./sandbox-run";

// One call wires the whole standard library for a real-filesystem eve agent:
// a workspace-scoped toolset (read/edit/write/glob/grep + host bash + webfetch
// + the discipline-enforcing todo), the background-task machinery
// (run_async/check_tasks/await_task over a persisted registry), and the
// matching dynamic instructions. Each
// `agent/tools/<name>.ts` file re-exports one tool — the filename is the wire
// name, so agents keep naming control (and can vacate eve's built-in
// read_file/write_file/bash with disable shims). Everything is also exported à
// la carte for agents that want a subset.

/**
 * Options for building the stdlib: workspace root, state directory, display
 * noun, media settings, steering, subagent roster, and optional
 * extra backgroundable operations.
 */
export interface StdlibOptions {
  /** Directory the agent works in; file tools refuse paths that escape it. */
  workspaceRoot: string;
  /**
   * Directory for the stdlib's local state: the background-task store
   * (`tasks.json`) and spilled oversized tool output (`tool-outputs/`).
   * Typically a gitignored dot-directory inside the workspace.
   */
  stateDir: string;
  /**
   * What tool descriptions call the workspace — "repo" for a coding agent in a
   * git checkout, "project", … Defaults to "workspace". Interpolated once at
   * build time, so descriptions stay prompt-cache stable.
   */
  workspaceNoun?: string;
  /**
   * Replaces bash's default "avoid interactive CLIs" warning — point it at
   * your agent's real-terminal tool if it has one.
   */
  bashInteractiveHint?: string;
  /** Extra run_async-able ops beyond bash (see defineOp). */
  extraBackgroundables?: (ctx: {
    workspace: Workspace;
    runner: CommandRunner;
  }) => readonly BackgroundableOp[];
  /**
   * The session model's own input capabilities, resolved by the consumer
   * (`capabilitiesForModel` over the gateway catalog, checked in — see
   * ./model-capabilities.ts). When provided, the look instruction states
   * which kinds the session model can view natively versus delegate.
   */
  parentCapabilities?: ModelInputCapabilities;
  /**
   * Wire the `look` media-oracle tool: delegate one question about a media
   * file the session model can't view to a pinned capable model. `true`
   * selects the recommended default oracle (`DEFAULT_MEDIA_ORACLE` —
   * Gemini 3 Flash, the one family covering images, PDFs, video, AND audio);
   * pass a {@link LookOracleConfig} to pin a different model or add metered
   * headers. When set, `tools.look` exists, `instructions.media` carries the
   * routing playbook, and read/webfetch's unavailable-media hints route to
   * `look` instead of dead-ending.
   */
  mediaOracle?: MediaOracleOption;
  /**
   * Verify command mentioned by the workflow instruction (e.g. "bun run
   * check"). Interpolated once at build time; omit for a generic hint.
   */
  verifyCommandHint?: string;
  /**
   * Attach a directory's conventions file to the first `read` under it, once
   * per directory per session (see ./dir-conventions.ts). The root file is
   * excluded — `instructions.repoConventions` covers it. Defaults to `true`.
   */
  injectDirConventions?: boolean;
  /**
   * Conventions filename the read riders look for. Defaults to "AGENTS.md".
   */
  conventionsFileName?: string;
  /**
   * Enable steering: a directory (typically under `stateDir`) where UI
   * clients queue mid-turn messages (see ./steer-inbox). Every stdlib tool is
   * wrapped so queued messages ride the next completing tool result; pass the
   * same dir to `createParkDeliveryHook({ steer })` so messages a turn ends
   * before delivering go out on park instead.
   */
  steer?: { dir: string };
  /**
   * Declared subagents the delegation playbook should route work to (e.g. the
   * model-tier task preset — see ./task.ts). Grows `instructions.subagents`
   * with a "Choosing a subagent" section. Interpolated once at build time.
   */
  subagentRoster?: readonly SubagentRosterEntry[];
  /**
   * Prose depth for every instruction section: `"full"` (default, each rule
   * with its rationale) or `"compact"` (~⅓ the prose, same load-bearing rules
   * and tool names — for small/code-tuned models where a long behavioral
   * prompt crowds the context). Both tiers are generated from one source, so
   * they can't drift. Applies to `instructions.stack` and every à la carte
   * instruction.
   */
  instructionTier?: InstructionTier;
  /**
   * Baseline sections `instructions.stack` should drop, by id (e.g. a
   * chat-only agent omitting `"subagents"`). À la carte instructions are
   * unaffected — simply don't wire the ones you don't want.
   */
  omitInstructionSections?: readonly InstructionStackSectionId[];
  /**
   * Consumer-owned sections `instructions.stack` inserts at baseline anchors
   * (see {@link PlacedPromptSection}). Pass a function to defer building
   * until "session.started" — for sections that read the filesystem per
   * session (e.g. a skills catalog) while staying prompt-cache stable within
   * the session.
   */
  extraInstructionSections?:
    | readonly PlacedPromptSection[]
    | (() => readonly PlacedPromptSection[]);
}

/**
 * Create the standard library for a real-filesystem eve agent: workspace-scoped
 * file tools (read/edit/write/glob/grep), host bash, webfetch, the discipline-
 * enforcing todo, the background-task registry, and the matching dynamic
 * instructions. Returns tools, the workspace, runner, registry, and
 * instructions.
 */
export function createStdlib(options: StdlibOptions) {
  const noun = options.workspaceNoun ?? "workspace";
  const workspace = createWorkspace(options.workspaceRoot);
  const spillDir = join(options.stateDir, TOOL_OUTPUT_DIRNAME);
  const runner = createCommandRunner({ workspace, spillDir });
  const registry: TaskRegistry = createTaskRegistry({
    storePath: join(options.stateDir, "tasks.json"),
  });
  const backgroundables: readonly BackgroundableOp[] = [
    createBashOp(runner),
    ...(options.extraBackgroundables?.({ workspace, runner }) ?? []),
  ];
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
  const steerInbox: SteerInbox | null = options.steer
    ? createSteerInbox({ dir: options.steer.dir })
    : null;
  const steer = createSteerWrapper(steerInbox);
  const oracle: LookOracleConfig | null =
    options.mediaOracle !== undefined ? resolveMediaOracle(options.mediaOracle) : null;
  const readImageHint = oracle ? lookReadImageHint(oracle) : undefined;
  const readMediaHint = oracle ? lookReadMediaHint(oracle) : undefined;
  const readOversizeHint = oracle ? lookOversizeHint(oracle) : undefined;
  const fetchedImageHint = oracle ? lookFetchedImageHint(oracle) : undefined;
  const fetchedMediaHint = oracle ? lookFetchedMediaHint(oracle) : undefined;
  return {
    workspace,
    runner,
    registry,
    spillDir,
    backgroundables,
    steerInbox,
    /**
     * The RESOLVED look oracle (`null` when `mediaOracle` wasn't set). Task
     * Children use this same resolved config when building their media
     * instruction because their `look` is a re-export of the parent instance.
     */
    mediaOracle: oracle,
    tools: {
      read: steer(
        createReadTool({
          workspace,
          noun,
          dirConventions,
          ...(readImageHint !== undefined
            ? { imageUnavailableHint: readImageHint }
            : {}),
          ...(readMediaHint !== undefined
            ? { mediaUnavailableHint: readMediaHint }
            : {}),
          ...(readOversizeHint !== undefined ? { oversizeHint: readOversizeHint } : {}),
        }),
      ),
      edit: steer(createEditTool({ workspace, noun })),
      write: steer(createWriteTool({ workspace, noun })),
      glob: steer(createGlobTool({ workspace, noun })),
      grep: steer(createGrepTool({ workspace, noun, spillDir })),
      bash: steer(
        createBashTool({
          workdir: workspace.root,
          runner,
          registry,
          noun,
          interactiveHint: options.bashInteractiveHint,
        }),
      ),
      tasks: createTasksTools({ registry, backgroundables, steerInbox }),
      todo: steer(createTodoTool()),
      webfetch: steer(
        createWebFetchTool({
          workspace,
          spillDir,
          ...(fetchedImageHint !== undefined
            ? { imageUnavailableHint: fetchedImageHint }
            : {}),
          ...(fetchedMediaHint !== undefined
            ? { mediaUnavailableHint: fetchedMediaHint }
            : {}),
        }),
      ),
      ...(oracle !== null
        ? { look: steer(createLookTool({ workspace, noun, oracle })) }
        : {}),
    },
    instructions: {
      /**
       * The whole baseline prompt as ONE instruction, in the SDK's canonical
       * section order — wire this single re-export instead of the per-section
       * files below (eve orders instruction slots alphabetically by filename,
       * so per-file wiring surrenders section order to filenames). Honors
       * `instructionTier`, `omitInstructionSections`, and
       * `extraInstructionSections`.
       */
      stack: createInstructionStackInstruction({
        workspaceRoot: workspace.root,
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
      repoConventions: createRepoConventionsInstruction({ workspaceRoot: workspace.root }),
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
 * The stdlib return type: workspace, runner, registry, spill dir,
 * backgroundables, steerInbox, tools, and instructions.
 */
export type Stdlib = ReturnType<typeof createStdlib>;

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
// Steering is absent (it tails a host-filesystem inbox), and notify watchers
// default off — see SandboxFileToolsOptions.notifications.

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
   * agents on durable hosts pass a real state path.
   */
  taskStorePath?: string;
  /** See {@link StdlibOptions.bashInteractiveHint}. */
  bashInteractiveHint?: string;
  /**
   * Advertise + wire `notify` watchers on bash/run_async (default `false`
   * here, unlike the stdlib's `true`): watcher notifications ride
   * `createParkDeliveryHook`, and without that hook registered they queue
   * but never deliver — a promise the model would plan around. An agent
   * that wires park delivery flips this on.
   */
  notifications?: boolean;
  /** See {@link StdlibOptions.injectDirConventions}. Defaults to `true`. */
  injectDirConventions?: boolean;
  /** See {@link StdlibOptions.conventionsFileName}. Defaults to "AGENTS.md". */
  conventionsFileName?: string;
  /**
   * See {@link StdlibOptions.mediaOracle}. The sandbox `look` reads bytes
   * through the sandbox session, so the oracle sees the session workspace's
   * files. Hosted Zo deployments pass `headers: { "x-zo-tool": "look" }` on
   * the config so the runtime proxy labels the tool's own model traffic.
   */
  mediaOracle?: MediaOracleOption;
  /**
   * See {@link StdlibOptions.parentCapabilities}. Here it informs the stack's
   * media section (which kinds to view natively versus delegate).
   */
  parentCapabilities?: ModelInputCapabilities;
  /** See {@link StdlibOptions.verifyCommandHint}. */
  verifyCommandHint?: string;
  /** See {@link StdlibOptions.subagentRoster}. */
  subagentRoster?: readonly SubagentRosterEntry[];
  /** See {@link StdlibOptions.instructionTier}. */
  instructionTier?: InstructionTier;
  /**
   * Further baseline sections `instructions.stack` should drop, by id — on
   * top of the sandbox topology's own omissions (see the `stack` doc on the
   * return value).
   */
  omitInstructionSections?: readonly InstructionStackSectionId[];
  /** See {@link StdlibOptions.extraInstructionSections}. */
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
  const notifications = options.notifications ?? false;
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
        notifications,
      }),
      tasks: createTasksTools({ registry, backgroundables, notifications }),
      ...(oracle !== null ? { look: createLookTool({ workspace, noun, oracle, io }) } : {}),
    },
    instructions: {
      /**
       * The composed instruction stack (see
       * `createInstructionStackInstruction`), pre-configured for the sandbox
       * topology: no repo-conventions section (the workspace isn't on this
       * process's disk and instruction resolvers have no sandbox access —
       * nested conventions ride the read tool's dir-conventions riders
       * instead), and the parallel-tools section matches this toolset's
       * `notifications` setting. The rest of the baseline — workflow,
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
        notifications,
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
    },
  };
}

/**
 * The sandbox file tools return type: workspace, IO provider, runner,
 * registry, backgroundables, tools (read/edit/write/glob/grep + bash + the
 * task tools + `look` when the oracle is wired), and the pre-configured
 * `instructions.stack`.
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

export {
  createParkDeliveryHook,
  type ParkDeliveryOptions,
} from "./hooks";
export {
  clientContinuationToken,
  createParkDeliveryState,
  type ParkDeliveryItem,
  type ParkDeliveryRequest,
  type ParkDeliveryState,
  type ParkNotification,
  postParkNotification,
  setParkNotificationHandler,
} from "./park-delivery";
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
export * from "./web-fetch";
export * from "./instructions";
export * from "./list-files";
export * from "./model-capabilities";
export * from "./prompt-sections";
export * from "./read-file-content";
export * from "./read-text";
export * from "./run";
export * from "./steer";
export {
  createSteerInbox,
  type SteerInbox,
  type SteerInboxOptions,
} from "./steer-inbox";
export {
  createSteerWrapper,
  type SteerSource,
  withSteerDelivery,
} from "./steer-tool";
export {
  createMockStoryModel,
  lastUserTextFrom,
  markdownChunks,
  MOCK_SCENARIOS,
  mockScenarioFrom,
  scriptActionFor,
  scriptStepFrom,
  toolInputFragments,
  type MockScenario,
  type MockScriptAction,
  type MockScriptedScenario,
  type MockStoryModelOptions,
  type MockToolCall,
} from "./mock-model";
export {
  isOrphanedTurn,
  type OrphanedTurnInput,
  workerEpochMs,
} from "./orphaned-turns";
export * from "./sandbox-io";
export * from "./sandbox-run";
export * from "./validated-compaction";
export * from "./visible-reasoning";
export * from "./walk";
export * from "./watch-output";
export * from "./workspace";
export * from "./workspace-io";
