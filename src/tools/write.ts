import { defineTool } from "eve/tools";
import { z } from "zod";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Workspace } from "../workspace";

// Replaces eve's sandbox `write_file` (vacate the framework name with a
// disable shim), writing to the real workspace under the Claude Code /
// opencode name `write`.
export function createWriteTool(opts: { workspace: Workspace; noun: string }) {
  const { workspace, noun } = opts;
  return defineTool({
    description: `Write a complete file to the ${noun}, creating parent directories and overwriting any existing file. For a small change to an existing file, prefer edit so you don't have to reproduce the whole file.`,
    inputSchema: z.object({
      path: z.string().min(1).describe(`File path, relative to the ${noun} root.`),
      content: z.string().describe("The full contents to write."),
    }),
    async execute({ path, content }) {
      const abs = workspace.resolve(path);
      const created = !existsSync(abs);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content, "utf8");
      return { ok: true, path: workspace.relativize(abs), created, bytes: Buffer.byteLength(content) };
    },
  });
}
