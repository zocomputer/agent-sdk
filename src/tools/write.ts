import { defineTool } from "eve/tools";
import { z } from "zod";
import { withPathLock } from "../path-locks";
import type { Workspace } from "../workspace";
import { localIoProvider, type WorkspaceIoProvider } from "../workspace-io";

// Replaces eve's sandbox `write_file` (vacate the framework name with a
// disable shim), writing to the workspace under the Claude Code /
// opencode name `write`.
export function createWriteTool(opts: {
  workspace: Workspace;
  noun: string;
  /** Per-call I/O backend (../workspace-io.ts). Defaults to local node:fs. */
  io?: WorkspaceIoProvider;
}) {
  const { workspace, noun } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  return defineTool({
    description: `Write a complete file to the ${noun}, creating parent directories and overwriting any existing file. For a small change to an existing file, prefer edit so you don't have to reproduce the whole file.`,
    inputSchema: z.object({
      path: z.string().min(1).describe(`File path, relative to the ${noun} root.`),
      content: z.string().describe("The full contents to write."),
    }),
    async execute({ path, content }, ctx) {
      const abs = workspace.resolve(path);
      const fio = io(ctx);
      // Same per-path serialization as edit: a write racing an edit to the
      // same file in one concurrent step must not interleave with its
      // read-modify-write (see ../path-locks.ts).
      return withPathLock(abs, async () => {
        const created = (await fio.stat(abs)) === null;
        await fio.writeFile(abs, content);
        return {
          ok: true,
          path: workspace.relativize(abs),
          created,
          bytes: Buffer.byteLength(content),
        };
      });
    },
  });
}
