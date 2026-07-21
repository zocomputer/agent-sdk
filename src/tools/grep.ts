import { defineTool } from "eve/tools";
import { z } from "zod";
import { join } from "node:path";
import type { Workspace } from "../workspace";
import {
  localIoProvider,
  type IoSearchMatch,
  type WorkspaceIoProvider,
} from "../workspace-io";

// Overrides eve's sandbox `grep`, searching workspace file contents through
// the I/O seam. The scan runs backend-native (../workspace-io.ts): locally an
// in-process line-by-line scan over `git ls-files` candidates with bounded
// reads (size cap + binary sniff), so a stray artifact can't stall a search;
// on a sandbox, ripgrep/grep executed remotely so bytes never cross the wire.
// For large/heavy searches the model can still use `bash` with ripgrep.
//
// When more lines match than fit in-context, the scan keeps going and spills
// the complete match list to the tool-outputs dir (same recovery shape as
// bash/webfetch): the model reads or greps that file instead of re-running the
// search narrower. Scanning already visits every candidate when matches are
// scarce, so continuing past the cap costs no more than a no-match search.
// The spill is written through the same IO as the scan, so on a sandbox it
// lands where the model's follow-up `read` can reach it.

/** Hard bound on a spilled scan, so `.` over a huge corpus still terminates early. */
export const GREP_SPILL_MAX_MATCHES = 5000;

/** Shown match text is clipped so one minified line can't flood the result. */
const MATCH_TEXT_MAX_CHARS = 300;

/** The tool's result shape, uniform across the complete/capped/spilled paths. */
export interface GrepResult {
  pattern: string;
  count: number;
  truncated: boolean;
  matches: { file: string; line: number; text: string }[];
  /** Absent when the backend can't count size-skipped files (remote search). */
  skippedLargeFiles?: number;
  totalMatches?: number;
  note?: string;
}

/** Build the grep tool for searching file contents by regex, with optional overflow spill to a result file. */
export function createGrepTool(opts: {
  workspace: Workspace;
  noun: string;
  /** Directory for overflow match lists; omit to keep the stop-at-cap behavior. */
  spillDir?: string;
  /** Per-call I/O backend (../workspace-io.ts). Defaults to local node:fs. */
  io?: WorkspaceIoProvider;
  /** Extra path guidance for consumers with explicit read-only roots. */
  pathHint?: string;
}) {
  const { workspace, noun, spillDir } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  return defineTool({
    description: `Search ${noun} file contents by regular expression, returning matching lines with their file and line number. Scope with \`path\` (a file or directory) and/or a \`glob\` on the filename.${opts.pathHint ?? ""} Gitignored files, build/VCS dirs, binaries, and files over ~1.5 MB are skipped.${spillDir === undefined ? "" : " When more lines match than max_results, the collected matches are saved to a file named in the result (the note says whether that list is complete) — read or grep that file instead of re-searching."}`,
    inputSchema: z.object({
      pattern: z.string().min(1).describe("JavaScript regular expression to search for."),
      path: z
        .string()
        .optional()
        .describe(
          `A file or directory (relative to the ${noun} root) to limit the search to.${opts.pathHint ?? ""}`,
        ),
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
    async execute({ pattern, path, glob, ignore_case, max_results }, ctx): Promise<GrepResult> {
      // Validate as a JS regex up front so a malformed pattern fails the same
      // way on every backend (a remote rg/grep would report its own error).
      try {
        new RegExp(pattern, ignore_case ? "i" : "");
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid regular expression: ${reason}`);
      }
      const max = max_results ?? 200;
      const fio = io(ctx);

      let scope: string | undefined;
      if (path) {
        const abs = workspace.resolve(path);
        const stat = await fio.stat(abs);
        if (stat === null) {
          throw new Error(`${workspace.relativize(abs)} does not exist.`);
        }
        scope = abs;
      }

      // Without a spill destination the scan stops as soon as it has proven
      // there are more than `max` matching lines; with one it keeps going so
      // the complete list can be written out. The hard bound applies either
      // way, so `.` over a huge corpus still terminates early.
      const cap =
        spillDir === undefined
          ? Math.min(max + 1, GREP_SPILL_MAX_MATCHES)
          : GREP_SPILL_MAX_MATCHES;
      const searched = await fio.search({
        pattern,
        ignoreCase: ignore_case ?? false,
        scope,
        glob,
        maxMatches: cap,
      });
      const clip = (m: IoSearchMatch) => ({
        file: m.file,
        line: m.line,
        text: m.text.slice(0, MATCH_TEXT_MAX_CHARS),
      });
      const matches = searched.matches.slice(0, max).map(clip);
      // Omit the count entirely when the backend can't know it (remote
      // searchers enforce the size cap without reporting skips) — a hard 0
      // would misinform the model.
      const skipped =
        searched.skippedLargeFiles === null
          ? {}
          : { skippedLargeFiles: searched.skippedLargeFiles };
      const hitHardBound =
        searched.stopped === "max-matches" && cap === GREP_SPILL_MAX_MATCHES;
      // A remote backend's byte cap cut the stream mid-scan: fewer than the
      // match cap were parsed and the spill can't claim completeness.
      const floodCut = searched.stopped === "output-cap";

      // A stopped scan is never complete, even when everything found so far
      // fits under max (a max_results at or above the hard bound).
      if (searched.stopped === false && searched.matches.length <= max) {
        return { pattern, count: matches.length, truncated: false, ...skipped, matches };
      }
      if (spillDir === undefined && !hitHardBound && !floodCut) {
        // "may exist": the backend stopped scanning at the cap, so we can't
        // know how many more there are.
        return {
          pattern,
          count: matches.length,
          truncated: true,
          ...skipped,
          matches,
          note: `Stopped at ${max} matching lines — more matches may exist. Narrow with path/glob or a more specific pattern, or raise max_results.`,
        };
      }

      // Every match, in `file:line: text` lines, for the spill file.
      const allLines = searched.matches.map(
        (m) => `${m.file}:${m.line}: ${m.text.slice(0, MATCH_TEXT_MAX_CHARS)}`,
      );
      let label: string | null = null;
      if (spillDir !== undefined) {
        const spillPath = join(
          spillDir,
          `grep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.txt`,
        );
        try {
          await fio.writeFile(spillPath, allLines.join("\n") + "\n");
          label = workspace.relativize(spillPath);
        } catch {
          // A failed spill degrades to the capped result, not an error.
        }
      }
      const found = floodCut
        ? `Search output hit the transfer cap after ${allLines.length} matching lines — more matches may exist`
        : hitHardBound
          ? `Stopped scanning at ${GREP_SPILL_MAX_MATCHES} matching lines`
          : `Found ${allLines.length} matching lines`;
      // "Complete" only when the scan genuinely covered everything — a
      // hard-bound or byte-capped scan spills what it collected, no more.
      const spillIsComplete = !floodCut && !hitHardBound;
      const where =
        label === null
          ? "Narrow with path/glob or a more specific pattern, or raise max_results."
          : `The ${spillIsComplete ? "complete list is" : "matches collected so far are"} at ${label} — read or grep that file, or narrow with path/glob.`;
      return {
        pattern,
        count: matches.length,
        totalMatches: allLines.length,
        truncated: true,
        ...skipped,
        matches,
        note: `${found} — showing the first ${matches.length} here. ${where}`,
      };
    },
  });
}
