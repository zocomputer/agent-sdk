import { defineTool } from "eve/tools";
import { z } from "zod";
import { statSync } from "node:fs";
import { globToRegExp } from "../glob-match";
import { listGitFiles } from "../list-files";
import { readTextForSearch } from "../read-text";
import { walkFiles } from "../walk";
import type { Workspace } from "../workspace";

// Overrides eve's sandbox `grep`, searching real workspace file contents.
// Candidates come from `git ls-files` (exact .gitignore semantics) with the
// in-process walk as fallback; matching runs in-process line-by-line with
// bounded reads (size cap + binary sniff), so a stray artifact can't stall a
// search. For large/heavy searches the model can still use `bash` with ripgrep.
export function createGrepTool(opts: { workspace: Workspace; noun: string }) {
  const { workspace, noun } = opts;
  return defineTool({
    description: `Search ${noun} file contents by regular expression, returning matching lines with their file and line number. Scope with \`path\` (a file or directory) and/or a \`glob\` on the filename. Gitignored files, build/VCS dirs, binaries, and files over ~1.5 MB are skipped.`,
    inputSchema: z.object({
      pattern: z.string().min(1).describe("JavaScript regular expression to search for."),
      path: z
        .string()
        .optional()
        .describe(`A file or directory (relative to the ${noun} root) to limit the search to.`),
      glob: z
        .string()
        .optional()
        .describe("Only search files whose path matches this glob, e.g. `**/*.ts`."),
      ignore_case: z.boolean().optional().describe("Case-insensitive match."),
      max_results: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max matching lines (default 200)."),
    }),
    async execute({ pattern, path, glob, ignore_case, max_results }) {
      let re: RegExp;
      try {
        re = new RegExp(pattern, ignore_case ? "i" : "");
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid regular expression: ${reason}`);
      }
      const globRe = glob ? globToRegExp(glob) : null;
      const max = max_results ?? 200;

      let candidates: Iterable<string>;
      if (path) {
        const abs = workspace.resolve(path);
        candidates = statSync(abs).isFile()
          ? [workspace.relativize(abs)]
          : (listGitFiles(workspace.root, workspace.relativize(abs)) ??
            walkFiles(abs, workspace.root));
      } else {
        candidates = listGitFiles(workspace.root) ?? walkFiles(workspace.root);
      }

      const matches: { file: string; line: number; text: string }[] = [];
      let skippedLargeFiles = 0;
      for (const file of candidates) {
        if (globRe && !globRe.test(file)) continue;
        const read = readTextForSearch(workspace.resolve(file));
        if (read.kind === "too-large") {
          skippedLargeFiles += 1;
          continue;
        }
        if (read.kind !== "text") continue;
        const lines = read.content.split("\n");
        for (const [index, line] of lines.entries()) {
          if (re.test(line)) {
            matches.push({ file, line: index + 1, text: line.slice(0, 300) });
            if (matches.length >= max) {
              return {
                pattern,
                count: matches.length,
                truncated: true,
                skippedLargeFiles,
                matches,
                // "may exist": we stop scanning at the cap, so we can't know
                // whether the corpus held more matches beyond it.
                note: `Stopped at ${max} matching lines — more matches may exist. Narrow with path/glob or a more specific pattern, or raise max_results.`,
              };
            }
          }
        }
      }
      return { pattern, count: matches.length, truncated: false, skippedLargeFiles, matches };
    },
  });
}
