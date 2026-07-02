import { defineTool } from "eve/tools";
import { z } from "zod";
import { readFileSync, statSync } from "node:fs";
import { buildFileView, READ_FILE_MAX_BYTES } from "../file-view";
import { loadFileContent } from "../read-file-content";
import type { Workspace } from "../workspace";

// Replaces eve's sandbox `read_file` (vacate the framework name with a disable
// shim), reading from the real workspace under the Claude Code / opencode name
// `read`. Content routes by sniffed kind (see ../read-file-content.ts): text is
// windowed directly; PDF/DOCX/spreadsheets are converted to text first; images
// return metadata only, because eve tool results are text/json — pixels can't
// ride a tool result yet (upstream gap; see the package README).
export function createReadTool(opts: { workspace: Workspace; noun: string }) {
  const { workspace, noun } = opts;
  return defineTool({
    description:
      `Read a file from the ${noun}, returning line-numbered text. PDF, DOCX, and spreadsheet files (.xlsx, .xlsm, .xls, .ods) are converted to plain text (PDFs get per-page markers, spreadsheets render as TSV per sheet); images return format/dimension metadata only. Read a file before editing it so your edits target the current text. Returns up to 2000 lines per call by default; page bigger files with offset/limit.`,
    inputSchema: z.object({
      path: z.string().min(1).describe(`File path, relative to the ${noun} root.`),
      offset: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("1-based line to start reading from."),
      limit: z.number().int().positive().optional().describe("Max number of lines to return."),
    }),
    async execute({ path, offset, limit }) {
      const abs = workspace.resolve(path);
      const rel = workspace.relativize(abs);
      const stat = statSync(abs);
      if (stat.size > READ_FILE_MAX_BYTES) {
        throw new Error(
          `${rel} is ${stat.size} bytes — too large to read (max ${READ_FILE_MAX_BYTES}). ` +
            "Use bash (head, sed -n, rg) to extract the part you need.",
        );
      }
      const content = await loadFileContent(readFileSync(abs), rel, {
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      });
      switch (content.kind) {
        case "text":
          return { path: rel, ...buildFileView(content.text, { offset, limit }) };
        case "pdf":
          return {
            path: rel,
            source: "pdf" as const,
            pages: content.pages,
            ...buildFileView(content.text, { offset, limit }),
          };
        case "docx":
          return {
            path: rel,
            source: "docx" as const,
            ...buildFileView(content.text, { offset, limit }),
          };
        case "sheet":
          return {
            path: rel,
            source: "sheet" as const,
            format: content.format,
            sheets: content.sheets,
            ...buildFileView(content.text, { offset, limit }),
          };
        case "image":
          return {
            path: rel,
            source: "image" as const,
            format: content.format,
            width: content.width,
            height: content.height,
            bytes: stat.size,
            note: "Image content cannot be returned as a tool result (text/json only). If you need to see this image, ask the user to attach it to the chat.",
          };
      }
    },
  });
}
