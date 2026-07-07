import { join } from "node:path";
import {
  DEFAULT_MAX_INLINE_IMAGE_BYTES,
  DEFAULT_MAX_INLINE_MEDIA_BYTES,
} from "./attachments";
import { createTaskRegistry, type TaskRegistry } from "./async-tasks";
import { createBashOp, type BackgroundableOp } from "./backgroundable";
import { TOOL_OUTPUT_DIRNAME } from "./bounded-output";
import { createDirConventionsTracker } from "./dir-conventions";
import {
  createCommunicationInstruction,
  createHitlInstruction,
  createParallelToolsInstruction,
  createRepoConventionsInstruction,
  createSubagentInstruction,
  createWorkflowInstruction,
  type SubagentRosterEntry,
} from "./instructions";
import { createCommandRunner, type CommandRunner } from "./run";
import { createSteerInbox, type SteerInbox } from "./steer-inbox";
import { createSteerWrapper } from "./steer-tool";
import { createBashTool } from "./tools/bash";
import { createEditTool } from "./tools/edit";
import { createGlobTool } from "./tools/glob";
import { createGrepTool } from "./tools/grep";
import { createReadTool } from "./tools/read";
import { createTasksTools } from "./tools/tasks";
import { createWebFetchTool } from "./tools/webfetch";
import { createWriteTool } from "./tools/write";
import { createWorkspace, type Workspace } from "./workspace";
import { sandboxIoProvider, type SandboxIoOptions } from "./sandbox-io";

// One call wires the whole standard library for a real-filesystem eve agent:
// a workspace-scoped toolset (read/edit/write/glob/grep + host bash + webfetch),
// the background-task machinery (run_async/check_tasks/await_task over a
// persisted registry), and the matching dynamic instructions. Each
// `agent/tools/<name>.ts` file re-exports one tool — the filename is the wire
// name, so agents keep naming control (and can vacate eve's built-in
// read_file/write_file/bash with disable shims). Everything is also exported à
// la carte for agents that want a subset.

/**
 * Options for building the stdlib: workspace root, state directory, display
 * noun, attachment/media settings, steering, subagent roster, and optional
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
   * When `read` or `webfetch` hits an image, embed its bytes on the tool
   * result so a client can re-inject it as a viewable attachment on the next
   * turn (see ./attachments and GUIDE.md). Requires a client that consumes
   * the attachment (rib, Zo); generic eve consumers can leave this off and get
   * the metadata-only "ask the user" note. Defaults to `true`.
   */
  attachImagesToChat?: boolean;
  /**
   * Max image size (bytes) to inline on the tool result; larger images fall
   * back to the metadata-only note. Defaults to 3 MiB — eve's attachment
   * staging inlines images up to that size at model-call time and text-stubs
   * bigger ones, so staying under it keeps the "queued" promise truthful.
   * Also bounds durable-stream bloat (the data URL rides the stream once per
   * read/fetch).
   */
  maxInlineImageBytes?: number;
  /**
   * Attach video files (mp4/mov/webm/mkv/avi) the way images attach. Defaults
   * to `false`: video input is provider-gated (Gemini accepts it; Claude and
   * most others don't), and eve's attachment staging currently hydrates only
   * images/PDFs back into the model call (see design/upstream-asks.md) —
   * enable once both hold for your agent.
   */
  attachVideoToChat?: boolean;
  /** Attach audio files (mp3/wav/ogg/flac/m4a). Same gating as video. */
  attachAudioToChat?: boolean;
  /**
   * Max video/audio size (bytes) to inline on the tool result. Defaults to
   * 10 MB (read's stat guard rejects bigger files outright; webfetch's 5 MB
   * response cap bites first for fetches).
   */
  maxInlineMediaBytes?: number;
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
}

/**
 * Create the standard library for a real-filesystem eve agent: workspace-scoped
 * file tools (read/edit/write/glob/grep), host bash, webfetch, the background-
 * task registry, and the matching dynamic instructions. Returns tools, the
 * workspace, runner, registry, and instructions.
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
  return {
    workspace,
    runner,
    registry,
    spillDir,
    backgroundables,
    steerInbox,
    tools: {
      read: steer(
        createReadTool({
          workspace,
          noun,
          attachImagesToChat: options.attachImagesToChat ?? true,
          maxInlineImageBytes:
            options.maxInlineImageBytes ?? DEFAULT_MAX_INLINE_IMAGE_BYTES,
          attachVideoToChat: options.attachVideoToChat ?? false,
          attachAudioToChat: options.attachAudioToChat ?? false,
          maxInlineMediaBytes:
            options.maxInlineMediaBytes ?? DEFAULT_MAX_INLINE_MEDIA_BYTES,
          dirConventions,
        }),
      ),
      edit: steer(createEditTool({ workspace, noun })),
      write: steer(createWriteTool({ workspace, noun })),
      glob: steer(createGlobTool({ workspace, noun })),
      grep: steer(createGrepTool({ workspace, noun, spillDir })),
      bash: steer(
        createBashTool({
          workspace,
          runner,
          registry,
          noun,
          interactiveHint: options.bashInteractiveHint,
        }),
      ),
      tasks: createTasksTools({ registry, backgroundables, steerInbox }),
      webfetch: steer(
        createWebFetchTool({
          workspace,
          spillDir,
          attachImagesToChat: options.attachImagesToChat ?? true,
          maxInlineImageBytes:
            options.maxInlineImageBytes ?? DEFAULT_MAX_INLINE_IMAGE_BYTES,
          attachVideoToChat: options.attachVideoToChat ?? false,
          attachAudioToChat: options.attachAudioToChat ?? false,
          maxInlineMediaBytes:
            options.maxInlineMediaBytes ?? DEFAULT_MAX_INLINE_MEDIA_BYTES,
        }),
      ),
    },
    instructions: {
      parallelTools: createParallelToolsInstruction(),
      repoConventions: createRepoConventionsInstruction({ workspaceRoot: workspace.root }),
      subagents: createSubagentInstruction({
        workspaceNoun: noun,
        roster: options.subagentRoster,
      }),
      workflow: createWorkflowInstruction({
        workspaceNoun: noun,
        verifyCommandHint: options.verifyCommandHint,
      }),
      communication: createCommunicationInstruction(),
      hitl: createHitlInstruction(),
    },
  };
}

/**
 * The stdlib return type: workspace, runner, registry, spill dir,
 * backgroundables, steerInbox, tools, and instructions.
 */
export type Stdlib = ReturnType<typeof createStdlib>;

// The sandbox-backed counterpart to the stdlib's file tools, for the hosted
// topology: the eve process runs on one machine (a Vercel Function) and the
// workspace lives in the session's sandbox (`ctx.getSandbox()`) on another.
// The stdlib's `node:fs` tools would read the harness's own disk there — the
// wrong filesystem entirely — so these route every effect through the
// sandbox session instead (see ./sandbox-io.ts). Consumers wire them exactly
// like stdlib tools (one `agent/tools/<name>.ts` re-export each) and vacate
// eve's built-in `read_file`/`write_file`/`glob`/`grep` with disable shims;
// `bash` stays eve's built-in — it is already sandbox-native.
//
// Host-process machinery that needs a local disk or shell (bash, the task
// registry, steering) is deliberately absent: on a hosted agent those either
// stay eve built-ins or don't apply.

/**
 * Options for the sandbox file tools: workspace root (inside the sandbox),
 * display noun, session resolver, spill dir, and attachment/media settings.
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
   * Sandbox directory for grep's overflow match lists (spilled through the
   * sandbox, so the model's follow-up `read` can reach them). Omit to keep
   * the stop-at-cap behavior.
   */
  spillDir?: string;
  /**
   * See {@link StdlibOptions.attachImagesToChat}. Defaults to `false` here —
   * the attachment path only works when the agent registers
   * `createParkDeliveryHook` AND its runtime can reach itself over loopback
   * to send the next-turn message; hosted serverless runtimes haven't
   * validated that leg. Until a consumer wires and verifies it, the honest
   * default is the metadata-only note (a "queued" promise that never
   * delivers is the silent failure the attachment contract exists to avoid).
   */
  attachImagesToChat?: boolean;
  /** See {@link StdlibOptions.maxInlineImageBytes}. */
  maxInlineImageBytes?: number;
  /** See {@link StdlibOptions.attachVideoToChat}. Defaults to `false`. */
  attachVideoToChat?: boolean;
  /** See {@link StdlibOptions.attachAudioToChat}. Defaults to `false`. */
  attachAudioToChat?: boolean;
  /** See {@link StdlibOptions.maxInlineMediaBytes}. */
  maxInlineMediaBytes?: number;
  /** See {@link StdlibOptions.injectDirConventions}. Defaults to `true`. */
  injectDirConventions?: boolean;
  /** See {@link StdlibOptions.conventionsFileName}. Defaults to "AGENTS.md". */
  conventionsFileName?: string;
}

/**
 * Create sandbox-backed file tools for hosted agents: read/edit/write/glob/grep
 * route through the sandbox session instead of the harness's local disk. Returns
 * the workspace, IO provider, and the five tools.
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
  return {
    workspace,
    io,
    tools: {
      read: createReadTool({
        workspace,
        noun,
        io,
        attachImagesToChat: options.attachImagesToChat ?? false,
        maxInlineImageBytes:
          options.maxInlineImageBytes ?? DEFAULT_MAX_INLINE_IMAGE_BYTES,
        attachVideoToChat: options.attachVideoToChat ?? false,
        attachAudioToChat: options.attachAudioToChat ?? false,
        maxInlineMediaBytes:
          options.maxInlineMediaBytes ?? DEFAULT_MAX_INLINE_MEDIA_BYTES,
        dirConventions,
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
    },
  };
}

/**
 * The sandbox file tools return type: workspace, IO provider, and tools
 * (read/edit/write/glob/grep).
 */
export type SandboxFileTools = ReturnType<typeof createSandboxFileTools>;

// À la carte surface: the tool/instruction factories and every lib module the
// tools are built from, for agents that compose their own set.
export { createBashTool } from "./tools/bash";
export { createEditTool } from "./tools/edit";
export { createGlobTool } from "./tools/glob";
export { createGrepTool, type GrepResult } from "./tools/grep";
export { createReadTool } from "./tools/read";
export { buildTasksToolset, createTasksTools } from "./tools/tasks";
export { createWebFetchTool } from "./tools/webfetch";
export { createWriteTool } from "./tools/write";

export * from "./attachments";
export {
  createParkDeliveryHook,
  type ParkDeliveryOptions,
} from "./hooks";
export {
  buildRedeliveryMessage,
  clientContinuationToken,
  createRedeliveryState,
  type PendingRedelivery,
  redeliveryFromEvent,
  type RedeliveryMessagePart,
  type RedeliveryRequest,
  type RedeliveryState,
} from "./redeliver";
export {
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
export * from "./task";
export * from "./extract/cache";
export * from "./extract/docx";
export * from "./extract/pdf";
export * from "./extract/sheet";
export * from "./file-kind";
export * from "./file-view";
export * from "./glob-match";
export * from "./web-fetch";
export * from "./instructions";
export * from "./list-files";
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
export * from "./sandbox-io";
export * from "./visible-reasoning";
export * from "./walk";
export * from "./watch-output";
export * from "./workspace";
export * from "./workspace-io";
