import { defineTool } from "eve/tools";
import { z } from "zod";
import { globToRegExp } from "../glob-match";
import { listGitFiles } from "../list-files";
import { walkFiles } from "../walk";
import type { Workspace } from "../workspace";

// Overrides eve's sandbox `glob`, searching the real workspace instead.
// Candidates come from `git ls-files` (exact .gitignore semantics — one fast
// spawn instead of walking build output), with the in-process walk as fallback
// when git can't answer (not a repo, git missing).
export function createGlobTool(opts: { workspace: Workspace; noun: string }) {
  const { workspace, noun } = opts;
  return defineTool({
    description: `Find files in the ${noun} by glob pattern, returning ${noun}-relative paths. \`**\` spans directories, \`*\` matches within a path segment. A pattern without a leading \`**/\` is matched at any depth (so \`*.ts\` finds .ts files anywhere). Gitignored files and build/VCS dirs are skipped.`,
    inputSchema: z.object({
      pattern: z.string().min(1).describe("Glob pattern, e.g. `**/*.ts` or `src/tools/*.ts`."),
      limit: z.number().int().positive().optional().describe("Max paths to return (default 500)."),
    }),
    async execute({ pattern, limit }) {
      const normalized =
        pattern.startsWith("**/") || pattern.startsWith("/")
          ? pattern.replace(/^\//, "")
          : `**/${pattern}`;
      const re = globToRegExp(normalized);
      const max = limit ?? 500;
      const candidates: Iterable<string> = listGitFiles(workspace.root) ?? walkFiles(workspace.root);
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
