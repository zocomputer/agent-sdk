import { defineTool } from "eve/tools";
import { z } from "zod";
import type { Workspace } from "../workspace";
import { localIoProvider, type WorkspaceIoProvider } from "../workspace-io";

// A new tool (no eve default, so no disable shim needed): exact-string
// replacement in an existing file, the workhorse for focused edits. old_string
// must match once unless replace_all. Named `edit` to match Claude Code / opencode.
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
      "Replace an exact string in an existing file. By default old_string must occur exactly once — include enough surrounding context to make it unique. Set replace_all to replace every occurrence (e.g. renaming a symbol).",
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
      const bytes = await fio.readFile(abs);
      if (bytes === null) throw new Error(`${rel} does not exist.`);
      const before = bytes.toString("utf8");
      const count = before.split(old_string).length - 1;
      if (count === 0) throw new Error(`old_string not found in ${rel}.`);
      if (count > 1 && !replace_all) {
        throw new Error(
          `old_string is not unique in ${rel} (${count} matches). Add surrounding context or set replace_all.`,
        );
      }
      // split/join avoids String.replace's `$` substitution in new_string.
      const after = before.split(old_string).join(new_string);
      await fio.writeFile(abs, after);
      return { ok: true, path: rel, replacements: count };
    },
  });
}
