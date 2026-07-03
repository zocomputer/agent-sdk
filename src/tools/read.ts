import { defineTool } from "eve/tools";
import { z } from "zod";
import { basename } from "node:path";
import { readFileSync, statSync } from "node:fs";
import { CHAT_ATTACHMENT_FIELD, type ImageChatAttachment } from "../attachments";
import type { DirConventionsRider, DirConventionsTracker } from "../dir-conventions";
import { imageMediaType } from "../file-kind";
import { buildFileView, READ_FILE_MAX_BYTES } from "../file-view";
import { loadFileContent } from "../read-file-content";
import type { Workspace } from "../workspace";

// Replaces eve's sandbox `read_file` (vacate the framework name with a disable
// shim), reading from the real workspace under the Claude Code / opencode name
// `read`. Content routes by sniffed kind (see ../read-file-content.ts): text is
// windowed directly; PDF/DOCX/spreadsheets are converted to text first.
//
// eve tool results are text/json — pixels can't ride one. So for an image under
// `maxInlineImageBytes`, we embed the bytes as a data URL on the raw result
// under CHAT_ATTACHMENT_FIELD (see ../attachments.ts) and strip that field in
// `toModelOutput`: the model sees metadata + a note, while a connected client
// reads the bytes off the tool-result event and re-injects the image as a real
// user message part on the next turn. Over the cap (or when disabled), we fall
// back to the metadata-only "ask the user to attach it" note.
export function createReadTool(opts: {
  workspace: Workspace;
  noun: string;
  attachImagesToChat: boolean;
  maxInlineImageBytes: number;
  /**
   * When set, the first read under a directory carrying its own conventions
   * file attaches that file to the result under `directory_conventions` —
   * once per directory per session (see ../dir-conventions.ts).
   */
  dirConventions?: { tracker: DirConventionsTracker; fileName: string };
}) {
  const { workspace, noun, attachImagesToChat, maxInlineImageBytes, dirConventions } = opts;
  // Static per-build (option-dependent, never per-turn): prompt-cache safe.
  const conventionsHint = dirConventions
    ? ` When a read first enters a directory with its own ${dirConventions.fileName} conventions file, the result includes it under directory_conventions (once per directory per session) — honor those conventions for work in that directory.`
    : "";
  return defineTool({
    description:
      `Read a file from the ${noun}, returning line-numbered text. PDF, DOCX, and spreadsheet files (.xlsx, .xlsm, .xls, .ods) are converted to plain text (PDFs get per-page markers, spreadsheets render as TSV per sheet); reading an image returns its metadata and queues the image to appear as a viewable attachment on your next message. Read a file before editing it so your edits target the current text. Returns up to 2000 lines per call by default; page bigger files with offset/limit.` +
      conventionsHint,
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
    async execute({ path, offset, limit }, ctx) {
      const abs = workspace.resolve(path);
      const rel = workspace.relativize(abs);
      const stat = statSync(abs);
      if (stat.size > READ_FILE_MAX_BYTES) {
        throw new Error(
          `${rel} is ${stat.size} bytes — too large to read (max ${READ_FILE_MAX_BYTES}). ` +
            "Use bash (head, sed -n, rg) to extract the part you need.",
        );
      }
      const buffer = readFileSync(abs);
      const content = await loadFileContent(buffer, rel, {
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      });
      // Conventions riders ride the RESULT (transcript-append, prompt-cache
      // safe). Collected only after the content load succeeded — a throwing
      // read must not consume the directory's once-per-session delivery slot.
      // A caller without an eve session (direct factory use) gets none.
      const riders: DirConventionsRider[] =
        dirConventions?.tracker.collect(ctx?.session?.id, rel) ?? [];
      const conventions =
        riders.length > 0 ? { directory_conventions: riders } : {};
      switch (content.kind) {
        case "text":
          return {
            path: rel,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions,
          };
        case "pdf":
          return {
            path: rel,
            source: "pdf" as const,
            pages: content.pages,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions,
          };
        case "docx":
          return {
            path: rel,
            source: "docx" as const,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions,
          };
        case "sheet":
          return {
            path: rel,
            source: "sheet" as const,
            format: content.format,
            sheets: content.sheets,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions,
          };
        case "image": {
          const meta = {
            path: rel,
            source: "image" as const,
            format: content.format,
            width: content.width,
            height: content.height,
            bytes: stat.size,
          };
          if (!attachImagesToChat || stat.size > maxInlineImageBytes) {
            const why =
              attachImagesToChat && stat.size > maxInlineImageBytes
                ? `too large to attach automatically (${stat.size} bytes, max ${maxInlineImageBytes})`
                : "cannot be returned as a tool result (text/json only)";
            return {
              ...meta,
              note: `Image content ${why}. If you need to see this image, ask the user to attach it to the chat.`,
              ...conventions,
            };
          }
          const attachment: ImageChatAttachment = {
            kind: "image",
            dataUrl: `data:${imageMediaType(content.format)};base64,${buffer.toString("base64")}`,
            mediaType: imageMediaType(content.format),
            filename: basename(rel),
            width: content.width,
            height: content.height,
          };
          return {
            ...meta,
            note: "This image is queued and will be attached to your next message as a viewable image — no need to ask the user to attach it.",
            [CHAT_ATTACHMENT_FIELD]: attachment,
            ...conventions,
          };
        }
      }
    },
    // Keep the embedded image bytes out of the model's context: the client reads
    // them off the raw tool-result event, the model only needs the note + meta.
    toModelOutput(output) {
      if (
        typeof output === "object" &&
        output !== null &&
        CHAT_ATTACHMENT_FIELD in output
      ) {
        const { [CHAT_ATTACHMENT_FIELD]: _omitted, ...rest } = output;
        return { type: "json", value: rest };
      }
      return { type: "json", value: output };
    },
  });
}
