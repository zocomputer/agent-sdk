import { join } from "node:path";
import { createTaskRegistry, type TaskRegistry } from "./async-tasks";
import { createBashOp, type BackgroundableOp } from "./backgroundable";
import { TOOL_OUTPUT_DIRNAME } from "./bounded-output";
import {
  createParallelToolsInstruction,
  createRepoConventionsInstruction,
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
}

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
  return {
    workspace,
    runner,
    registry,
    spillDir,
    backgroundables,
    tools: {
      read: createReadTool({ workspace, noun }),
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

export * from "./async-tasks";
export * from "./backgroundable";
export * from "./bounded-output";
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
export * from "./workspace";
