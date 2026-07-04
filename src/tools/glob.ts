import { defineTool } from "eve/tools";
import { z } from "zod";
import { globToRegExp } from "../glob-match";
import type { Workspace } from "../workspace";
import { localIoProvider, type WorkspaceIoProvider } from "../workspace-io";

// Overrides eve's sandbox `glob`, searching the workspace through the I/O
// seam. Candidates come from the backend's file listing — locally `git
// ls-files` (exact .gitignore semantics — one fast spawn instead of walking
// build output) with the in-process walk as fallback; on a sandbox, the same
// git listing executed remotely.
export function createGlobTool(opts: {
  workspace: Workspace;
  noun: string;
  /** Per-call I/O backend (../workspace-io.ts). Defaults to local node:fs. */
  io?: WorkspaceIoProvider;
}) {
  const { workspace, noun } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  return defineTool({
    description: `Find files in the ${noun} by glob pattern, returning ${noun}-relative paths. \`**\` spans directories, \`*\` matches within a path segment. A pattern without a leading \`**/\` is matched at any depth (so \`*.ts\` finds .ts files anywhere). Gitignored files and build/VCS dirs are skipped.`,
    inputSchema: z.object({
      pattern: z.string().min(1).describe("Glob pattern, e.g. `**/*.ts` or `src/tools/*.ts`."),
      limit: z.number().int().positive().optional().describe("Max paths to return (default 500)."),
    }),
    async execute({ pattern, limit }, ctx) {
      const normalized =
        pattern.startsWith("**/") || pattern.startsWith("/")
          ? pattern.replace(/^\//, "")
          : `**/${pattern}`;
      const re = globToRegExp(normalized);
      const max = limit ?? 500;
      const candidates = await io(ctx).listFiles();
      const files: string[] = [];
      let truncated = false;
      for (const file of candidates) {
        if (re.test(file)) {
          if (files.length >= max) {
            truncated = true;
            break;
          }
          files.push(file);
        }
      }
      return {
        pattern,
        count: files.length,
        truncated,
        files,
        ...(truncated
          ? { note: `More matches exist beyond the first ${max}. Use a more specific pattern, or raise limit.` }
          : {}),
      };
    },
  });
}
