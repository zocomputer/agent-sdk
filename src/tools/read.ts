import { defineTool } from "eve/tools";
import { z } from "zod";
import { basename } from "node:path";
import {
  CHAT_ATTACHMENT_FIELD,
  DEFAULT_MAX_INLINE_MEDIA_BYTES,
  type ChatAttachment,
} from "../attachments";
import type { DirConventionsRider, DirConventionsTracker } from "../dir-conventions";
import { audioMediaType, imageMediaType, videoMediaType } from "../file-kind";
import { buildFileView, READ_FILE_MAX_BYTES } from "../file-view";
import { loadFileContent } from "../read-file-content";
import type { Workspace } from "../workspace";
import { localIoProvider, type WorkspaceIoProvider } from "../workspace-io";

/** The description phrase covering media reads/fetches, from the enabled
 * attach kinds. Shared with `createWebFetchTool`; static per factory build. */
export function buildMediaHint(
  attach: { image: boolean; video: boolean; audio: boolean },
  verb: "reading" | "fetching",
): string {
  const kinds = ["image", "video", "audio"] as const;
  const on = kinds.filter((kind) => attach[kind]);
  const off = kinds.filter((kind) => !attach[kind]);
  const list = (items: readonly string[]) => items.join(" or ");
  if (on.length === 0) {
    return `${verb} media (images, video, audio) returns metadata only`;
  }
  const queued = `${verb} ${list(on)} files returns metadata and queues the file to appear as a viewable attachment on your next message`;
  return off.length === 0
    ? queued
    : `${queued} (${list(off)} ${verb === "reading" ? "reads" : "fetches"} return metadata only)`;
}

// Replaces eve's sandbox `read_file` (vacate the framework name with a disable
// shim), reading from the real workspace under the Claude Code / opencode name
// `read`. Content routes by sniffed kind (see ../read-file-content.ts): text is
// windowed directly; PDF/DOCX/spreadsheets are converted to text first.
//
// eve tool results are text/json — pixels can't ride one. So for media under
// the inline cap, we embed the bytes as a data URL on the raw result under
// CHAT_ATTACHMENT_FIELD (see ../attachments.ts) and strip that field in
// `toModelOutput`: the model sees metadata + a note, while a connected client
// reads the bytes off the tool-result event and re-injects the media as a real
// user message part on the next turn. Over the cap (or when disabled), we fall
// back to a metadata-only note. Images attach by default; video/audio are
// opt-in because model support is provider-gated (Gemini takes them, Claude
// does not) and eve's attachment staging today hydrates only images/PDFs back
// into the model call (see design/upstream-asks.md).
/** Build the read tool that returns line-numbered text, converts PDFs/DOCX/spreadsheets, and queues image/video/audio attachments. */
export function createReadTool(opts: {
  workspace: Workspace;
  noun: string;
  /**
   * The I/O backend resolved per call (see ../workspace-io.ts). Defaults to
   * the local node:fs backend; hosted agents pass the sandbox provider
   * (../sandbox-io.ts) so reads hit the session's workspace.
   */
  io?: WorkspaceIoProvider;
  attachImagesToChat: boolean;
  maxInlineImageBytes: number;
  /**
   * Attach video files (mp4/mov/webm/mkv/avi) the way images attach. Default
   * false — enable only when the agent's model accepts video input AND the
   * runtime delivers video file parts (see the module comment).
   */
  attachVideoToChat?: boolean;
  /** Attach audio files (mp3/wav/ogg/flac/m4a). Same gating as video. */
  attachAudioToChat?: boolean;
  /**
   * Max video/audio size (bytes) to inline on the tool result. Defaults to
   * 10 MB — the read stat guard rejects bigger files before this bites.
   */
  maxInlineMediaBytes?: number;
  /**
   * When set, the first read under a directory carrying its own conventions
   * file attaches that file to the result under `directory_conventions` —
   * once per directory per session (see ../dir-conventions.ts).
   */
  dirConventions?: { tracker: DirConventionsTracker; fileName: string } | undefined;
  /**
   * The "what to do instead" sentence in the file-too-large error. Defaults
   * to the bash suggestion; agents without bash point it at the tools they
   * do have.
   */
  oversizeHint?: string;
  /**
   * The "what to do instead" sentence in the image result note when the
   * pixels can't be delivered (attach disabled or over the size cap).
   * Defaults to asking the user to attach the image; agents without HITL
   * substitute advice that's actually actionable.
   */
  imageUnavailableHint?: string;
  /**
   * The "what to do instead" sentence in the video/audio result note when the
   * bytes can't be delivered (attach disabled — the default — or over the
   * cap). Defaults to steering toward bash extraction (ffmpeg frames read as
   * images); agents without bash substitute their own.
   */
  mediaUnavailableHint?: string;
  /**
   * Include the read-before-edit guidance in the description. Default true;
   * read-only consumers turn it off — there is no edit.
   */
  includeEditGuidance?: boolean;
}) {
  const { workspace, noun, attachImagesToChat, maxInlineImageBytes, dirConventions } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  const attachVideoToChat = opts.attachVideoToChat ?? false;
  const attachAudioToChat = opts.attachAudioToChat ?? false;
  const maxInlineMediaBytes = opts.maxInlineMediaBytes ?? DEFAULT_MAX_INLINE_MEDIA_BYTES;
  const oversizeHint =
    opts.oversizeHint ?? "Use bash (head, sed -n, rg) to extract the part you need.";
  const imageUnavailableHint =
    opts.imageUnavailableHint ??
    "If you need to see this image, ask the user to attach it to the chat.";
  const mediaUnavailableHint =
    opts.mediaUnavailableHint ??
    "If you need its contents, extract what you can with bash (e.g. ffmpeg frames from a video, read as images) or ask the user about it.";
  // Static per-build (option-dependent, never per-turn): prompt-cache safe.
  const conventionsHint = dirConventions
    ? ` When a read first enters a directory with its own ${dirConventions.fileName} conventions file, the result includes it under directory_conventions (once per directory per session) — honor those conventions for work in that directory.`
    : "";
  // Only promise the attachment path for kinds a client actually delivers
  // (attach option + the park-delivery hook); otherwise be honest that the
  // read is metadata-only.
  const mediaHint = buildMediaHint(
    { image: attachImagesToChat, video: attachVideoToChat, audio: attachAudioToChat },
    "reading",
  );
  const editHint =
    (opts.includeEditGuidance ?? true)
      ? " Read a file before editing it so your edits target the current text."
      : "";
  return defineTool({
    description:
      `Read a file from the ${noun}, returning line-numbered text. Documents are converted to plain text: PDF (per-page markers), DOCX/ODT/RTF, PPTX/ODP decks (per-slide markers, speaker notes), spreadsheets (.xlsx, .xlsm, .xls, .ods; TSV per sheet), EPUB (per-section markers), and Jupyter notebooks (per-cell markers); ${mediaHint}.${editHint} Returns up to 2000 lines per call by default; page bigger files with offset/limit.` +
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
      const fio = io(ctx);
      const stat = await fio.stat(abs);
      if (stat === null) throw new Error(`${rel} does not exist.`);
      if (!stat.isFile) {
        throw new Error(`${rel} is not a regular file. Use glob to list a directory.`);
      }
      if (stat.size > READ_FILE_MAX_BYTES) {
        throw new Error(
          `${rel} is ${stat.size} bytes — too large to read (max ${READ_FILE_MAX_BYTES}). ` +
            oversizeHint,
        );
      }
      const buffer = await fio.readFile(abs);
      if (buffer === null) throw new Error(`${rel} does not exist.`);
      const content = await loadFileContent(buffer, rel, {
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      });
      // Conventions riders ride the RESULT (transcript-append, prompt-cache
      // safe). Collected only after the content load succeeded — a throwing
      // read must not consume the directory's once-per-session delivery slot.
      // A caller without an eve session (direct factory use) gets none.
      // Riders load through the same per-call IO as the read, so a
      // sandbox-backed read delivers sandbox conventions files. Riders are
      // best-effort garnish: a failing collection (a transient sandbox error
      // on the rider hop) must never fail the read the model actually asked
      // for — the tracker leaves failed dirs unconsumed, so delivery retries
      // on a later read.
      const riders: DirConventionsRider[] = await (async () => {
        try {
          return (
            (await dirConventions?.tracker.collect(
              ctx?.session?.id,
              rel,
              async (absPath) => {
                const bytes = await fio.readFile(absPath);
                return bytes === null ? null : bytes.toString("utf8");
              },
            )) ?? []
          );
        } catch {
          return [];
        }
      })();
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
        case "pptx":
        case "odp":
          return {
            path: rel,
            source: content.kind,
            slides: content.slides,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions,
          };
        case "odt":
        case "rtf":
          return {
            path: rel,
            source: content.kind,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions,
          };
        case "epub":
          return {
            path: rel,
            source: "epub" as const,
            sections: content.sections,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions,
          };
        case "ipynb":
          return {
            path: rel,
            source: "ipynb" as const,
            cells: content.cells,
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
                : "cannot be returned as a tool result (text/json only), and image attachments are not enabled for this agent";
            return {
              ...meta,
              note: `Image content ${why}. ${imageUnavailableHint}`,
              ...conventions,
            };
          }
          const attachment: ChatAttachment = {
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
        case "video":
        case "audio": {
          const kind = content.kind;
          const mediaType =
            kind === "video"
              ? videoMediaType(content.format)
              : audioMediaType(content.format);
          const meta = {
            path: rel,
            source: kind,
            format: content.format,
            mediaType,
            bytes: stat.size,
          };
          const label = kind === "video" ? "Video" : "Audio";
          const enabled = kind === "video" ? attachVideoToChat : attachAudioToChat;
          if (!enabled || stat.size > maxInlineMediaBytes) {
            const why =
              enabled && stat.size > maxInlineMediaBytes
                ? `too large to attach automatically (${stat.size} bytes, max ${maxInlineMediaBytes})`
                : `cannot be returned as a tool result (text/json only), and ${kind} attachments are not enabled for this agent`;
            return {
              ...meta,
              note: `${label} content ${why}. ${mediaUnavailableHint}`,
              ...conventions,
            };
          }
          const attachment: ChatAttachment = {
            kind,
            dataUrl: `data:${mediaType};base64,${buffer.toString("base64")}`,
            mediaType,
            filename: basename(rel),
          };
          return {
            ...meta,
            note: `This ${kind} file is queued and will be attached to your next message — no need to ask the user to attach it.`,
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
