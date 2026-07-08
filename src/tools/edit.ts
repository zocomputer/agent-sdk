import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  EditDisproportionateError,
  EditNotFoundError,
  EditNotUniqueError,
  joinBom,
  replaceForgiving,
  splitBom,
} from "../edit-match";
import { withPathLock } from "../path-locks";
import type { Workspace } from "../workspace";
import { localIoProvider, type WorkspaceIoProvider } from "../workspace-io";

// A new tool (no eve default, so no disable shim needed): string replacement
// in an existing file, the workhorse for focused edits. Matching goes through
// the forgiving cascade (../edit-match.ts, ported from opencode): exact first,
// then whitespace/indentation/escape-tolerant strategies, refusing spans
// disproportionately larger than old_string. old_string must resolve to one
// span unless replace_all. Named `edit` to match Claude Code / opencode.
/** Build the edit tool for string replacement in existing files. */
export function createEditTool(opts: {
  workspace: Workspace;
  noun: string;
  /** Per-call I/O backend (../workspace-io.ts). Defaults to local node:fs. */
  io?: WorkspaceIoProvider;
}) {
  const { workspace, noun } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  return defineTool({
    description:
      "Replace a string in an existing file. Prefer the exact text from a read; near-miss whitespace, indentation, and over-escaping are tolerated, but a match much larger than old_string is refused. By default old_string must resolve to exactly one place — include enough surrounding context to make it unique. Set replace_all to replace every occurrence (e.g. renaming a symbol).",
    inputSchema: z.object({
      path: z.string().min(1).describe(`File path, relative to the ${noun} root.`),
      old_string: z
        .string()
        .min(1)
        .describe("Exact text to replace; must currently exist in the file."),
      new_string: z.string().describe("Text to replace it with."),
      replace_all: z
        .boolean()
        .optional()
        .describe("Replace every occurrence instead of requiring a single match."),
    }),
    async execute({ path, old_string, new_string, replace_all }, ctx) {
      const abs = workspace.resolve(path);
      const rel = workspace.relativize(abs);
      const fio = io(ctx);
      // Serialized per path: eve runs a step's tool calls concurrently, and
      // two unserialized edits to one file both read the same original text —
      // the second write silently drops the first edit (see ../path-locks.ts).
      return withPathLock(abs, async () => {
        const bytes = await fio.readFile(abs);
        if (bytes === null) throw new Error(`${rel} does not exist.`);
        // Strip a leading BOM so old_string never has to match around it;
        // re-attach on write.
        const { bom, text: before } = splitBom(bytes.toString("utf8"));
        let result;
        try {
          result = replaceForgiving(before, old_string, new_string, replace_all ?? false);
        } catch (error) {
          // Re-throw the typed matcher errors with the file's path in the
          // message — the model sees these verbatim.
          if (error instanceof EditNotFoundError) {
            throw new Error(
              `old_string not found in ${rel}. It must match the file contents — re-read the file and copy the exact text, including whitespace and indentation.`,
            );
          }
          if (error instanceof EditNotUniqueError) {
            throw new Error(
              `old_string is not unique in ${rel}. Add surrounding context to make the match unique, or set replace_all.`,
            );
          }
          if (error instanceof EditDisproportionateError) {
            throw new Error(
              `Refusing the edit in ${rel}: the closest match is much larger than old_string. Re-read the file and provide the full exact old_string.`,
            );
          }
          throw error;
        }
        await fio.writeFile(abs, joinBom(result.content, bom));
        return { ok: true, path: rel, replacements: result.replacements, matched: result.matched };
      });
    },
  });
}
