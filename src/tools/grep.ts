import { defineTool } from "eve/tools";
import { z } from "zod";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
//
// When more lines match than fit in-context, the scan keeps going and spills
// the complete match list to the tool-outputs dir (same recovery shape as
// bash/webfetch): the model reads or greps that file instead of re-running the
// search narrower. Scanning already visits every candidate when matches are
// scarce, so continuing past the cap costs no more than a no-match search.

/** Hard bound on a spilled scan, so `.` over a huge corpus still terminates early. */
export const GREP_SPILL_MAX_MATCHES = 5000;

export function createGrepTool(opts: {
  workspace: Workspace;
  noun: string;
  /** Directory for overflow match lists; omit to keep the stop-at-cap behavior. */
  spillDir?: string;
}) {
  const { workspace, noun, spillDir } = opts;
  return defineTool({
    description: `Search ${noun} file contents by regular expression, returning matching lines with their file and line number. Scope with \`path\` (a file or directory) and/or a \`glob\` on the filename. Gitignored files, build/VCS dirs, binaries, and files over ~1.5 MB are skipped.${spillDir === undefined ? "" : " When more lines match than max_results, the complete match list is saved to a file named in the result — read or grep that file instead of re-searching."}`,
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
      // Every match, in `file:line: text` lines, for the spill file. Only
      // grows past `max` when a spill dir exists to receive it.
      const allLines: string[] = [];
      let scanStopped = false;
      let skippedLargeFiles = 0;
      scan: for (const file of candidates) {
        if (globRe && !globRe.test(file)) continue;
        const read = readTextForSearch(workspace.resolve(file));
        if (read.kind === "too-large") {
          skippedLargeFiles += 1;
          continue;
        }
        if (read.kind !== "text") continue;
        const lines = read.content.split("\n");
        for (const [index, line] of lines.entries()) {
          if (!re.test(line)) continue;
          const text = line.slice(0, 300);
          allLines.push(`${file}:${index + 1}: ${text}`);
          if (matches.length < max) {
            matches.push({ file, line: index + 1, text });
          } else if (spillDir === undefined) {
            // No spill destination — stop at the cap as before. "may exist":
            // we stop scanning here, so we can't know how many more there are.
            return {
              pattern,
              count: matches.length,
              truncated: true,
              skippedLargeFiles,
              matches,
              note: `Stopped at ${max} matching lines — more matches may exist. Narrow with path/glob or a more specific pattern, or raise max_results.`,
            };
          }
          if (allLines.length >= GREP_SPILL_MAX_MATCHES) {
            scanStopped = true;
            break scan;
          }
        }
      }
      // A stopped scan is never complete, even when everything found so far
      // fits under max (a max_results at or above the hard bound).
      if (!scanStopped && allLines.length <= max) {
        return { pattern, count: matches.length, truncated: false, skippedLargeFiles, matches };
      }
      let label: string | null = null;
      if (spillDir !== undefined) {
        const spillPath = join(
          spillDir,
          `grep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.txt`,
        );
        try {
          mkdirSync(dirname(spillPath), { recursive: true });
          writeFileSync(spillPath, allLines.join("\n") + "\n");
          label = workspace.relativize(spillPath);
        } catch {
          // A failed spill degrades to the capped result, not an error.
        }
      }
      const found = scanStopped
        ? `Stopped scanning at ${GREP_SPILL_MAX_MATCHES} matching lines`
        : `Found ${allLines.length} matching lines`;
      const where =
        label === null
          ? "Narrow with path/glob or a more specific pattern, or raise max_results."
          : `The complete list is at ${label} — read or grep that file, or narrow with path/glob.`;
      return {
        pattern,
        count: matches.length,
        totalMatches: allLines.length,
        truncated: true,
        skippedLargeFiles,
        matches,
        note: `${found} — showing the first ${matches.length} here. ${where}`,
      };
    },
  });
}
