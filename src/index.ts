import { join } from "node:path";
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
} from "./instructions";
import { createCommandRunner, type CommandRunner } from "./run";
import { createBashTool } from "./tools/bash";
import { createEditTool } from "./tools/edit";
import { createGlobTool } from "./tools/glob";
import { createGrepTool } from "./tools/grep";
import { createReadTool } from "./tools/read";
import { createTasksTools } from "./tools/tasks";
import { createWriteTool } from "./tools/write";
import { createWorkspace, type Workspace } from "./workspace";

// One call wires the whole standard library for a real-filesystem eve agent:
// a workspace-scoped toolset (read/edit/write/glob/grep + host bash), the
// background-task machinery (run_async/check_tasks/await_task over a persisted
// registry), and the matching dynamic instructions. Each `agent/tools/<name>.ts`
// file re-exports one tool — the filename is the wire name, so agents keep
// naming control (and can vacate eve's built-in read_file/write_file/bash with
// disable shims). Everything is also exported à la carte for agents that want
// a subset.

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
   * When `read` hits an image, embed its bytes on the tool result so a client
   * can re-inject it as a viewable attachment on the next turn (see
   * ./attachments and the README). Requires a client that consumes the
   * attachment (rib, Zo); generic eve consumers can leave this off and get the
   * metadata-only "ask the user" note. Defaults to `true`.
   */
  attachImagesToChat?: boolean;
  /**
   * Max image size (bytes) to inline on the tool result; larger images fall
   * back to the metadata-only note. Defaults to 5 MB. Bounds durable-stream
   * bloat, since the data URL rides the stream once per read.
   */
  maxInlineImageBytes?: number;
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
}

/** Default cap for inlining image bytes on a `read` result (5 MB). */
export const DEFAULT_MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024;

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
  return {
    workspace,
    runner,
    registry,
    spillDir,
    backgroundables,
    tools: {
      read: createReadTool({
        workspace,
        noun,
        attachImagesToChat: options.attachImagesToChat ?? true,
        maxInlineImageBytes:
          options.maxInlineImageBytes ?? DEFAULT_MAX_INLINE_IMAGE_BYTES,
        dirConventions,
      }),
      edit: createEditTool({ workspace, noun }),
      write: createWriteTool({ workspace, noun }),
      glob: createGlobTool({ workspace, noun }),
      grep: createGrepTool({ workspace, noun }),
      bash: createBashTool({
        workspace,
        runner,
        registry,
        noun,
        interactiveHint: options.bashInteractiveHint,
      }),
      tasks: createTasksTools({ registry, backgroundables }),
    },
    instructions: {
      parallelTools: createParallelToolsInstruction(),
      repoConventions: createRepoConventionsInstruction({ workspaceRoot: workspace.root }),
      subagents: createSubagentInstruction({ workspaceNoun: noun }),
      workflow: createWorkflowInstruction({
        workspaceNoun: noun,
        verifyCommandHint: options.verifyCommandHint,
      }),
      communication: createCommunicationInstruction(),
      hitl: createHitlInstruction(),
    },
  };
}

export type Stdlib = ReturnType<typeof createStdlib>;

// À la carte surface: the tool/instruction factories and every lib module the
// tools are built from, for agents that compose their own set.
export { createBashTool } from "./tools/bash";
export { createEditTool } from "./tools/edit";
export { createGlobTool } from "./tools/glob";
export { createGrepTool } from "./tools/grep";
export { createReadTool } from "./tools/read";
export { buildTasksToolset, createTasksTools } from "./tools/tasks";
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
export * from "./dir-conventions";
export * from "./extract/cache";
export * from "./extract/docx";
export * from "./extract/pdf";
export * from "./extract/sheet";
export * from "./file-kind";
export * from "./file-view";
export * from "./glob-match";
export * from "./instructions";
export * from "./list-files";
export * from "./read-file-content";
export * from "./read-text";
export * from "./run";
export * from "./walk";
export * from "./watch-output";
export * from "./workspace";
