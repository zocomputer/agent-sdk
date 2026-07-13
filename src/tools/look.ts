import type { LanguageModel, ModelMessage } from "ai";
import { defineTool } from "eve/tools";
import { basename } from "node:path";
import { z } from "zod";
import {
  audioMediaType,
  detectFileKind,
  imageMediaType,
  videoMediaType,
} from "../file-kind";
import {
  describeCapabilities,
  type ModelInputCapabilities,
} from "../model-capabilities";
import type { Workspace } from "../workspace";
import { localIoProvider, type WorkspaceIoProvider } from "../workspace-io";

// The media oracle: delegate one question about a media file to a pinned
// model that can see it, when the session's own model can't. Conceptually a
// one-shot media subagent; mechanically a plain tool call — the tool reads
// the bytes through the workspace IO, builds ONE user message (text prompt +
// file part), and calls the AI SDK directly. That sidesteps every eve media
// gate at once: subagent input is text-only, tool results are text/json,
// park-delivery doesn't run in task children, and eve's attachment hydration
// stubs video/audio for every model (see
// design/proposals/eve-hydrate-model-aware-media.md). Nothing here touches
// eve staging, so the oracle sees exactly the bytes read off the workspace.
//
// Model resolution rides the AI SDK's rails: a gateway slug string resolves
// through the global default provider — on hosted Zo that's the metered
// runtime proxy (`@zocomputer/runtime-ai/register`); elsewhere it's the
// Vercel AI Gateway via `AI_GATEWAY_API_KEY` — and a `LanguageModel` instance
// is passed through untouched. Consumers that meter per-tool usage pass
// `headers` (Zo stamps `x-zo-tool: look`); this package forwards them
// opaquely and holds no credentials.

/** Default byte cap for the file sent to the oracle — the Gemini API's inline-data request budget. */
export const DEFAULT_LOOK_MAX_INPUT_BYTES = 20 * 1024 * 1024;

/**
 * Default total timeout for the oracle call, in ms. The session model's own
 * calls ride a guarded fetch (see ../gateway-fetch.ts) so a dead connection
 * errors into a retry, but `look`'s one-shot `generateText` runs on the
 * provider's plain fetch — without a cap, a stalled gateway hangs the whole
 * turn. Three minutes is generous for a 20 MiB upload + analysis (a real
 * video round-trip measures single-digit seconds) while staying under the
 * ~4-minute window past which a blocked tool call also expires the
 * provider's prompt cache.
 */
export const DEFAULT_LOOK_TIMEOUT_MS = 180_000;

/** Character cap on the oracle's answer before truncation (tool results enter the transcript permanently). */
export const LOOK_MAX_ANSWER_CHARS = 30_000;

/**
 * One oracle configuration: the pinned model, its display name, its input
 * capabilities (drives both the refusal logic and the tool description), and
 * optional per-call headers for the generate call.
 */
export interface LookOracleConfig {
  /**
   * The oracle model — a gateway slug (resolved through the AI SDK's default
   * provider) or a `LanguageModel` instance.
   */
  model: LanguageModel;
  /** Display name baked into the tool description (e.g. "Gemini 3 Flash"). */
  modelName: string;
  /**
   * What the oracle can view. The tool refuses kinds outside this set with
   * an error naming it, and the description advertises exactly this set —
   * resolve it with `capabilitiesForModel` (../model-capabilities.ts) in a
   * one-shot refresh script and check the result in.
   */
  capabilities: ModelInputCapabilities;
  /**
   * Extra headers on every generate call. How a metered deployment labels
   * the tool's own model traffic (Zo passes `{ "x-zo-tool": "look" }`);
   * forwarded opaquely.
   */
  headers?: Record<string, string>;
  /**
   * Total timeout for the generate call, ms. Defaults to
   * {@link DEFAULT_LOOK_TIMEOUT_MS} — the tool's substitute for the stream
   * guards the session model's own fetch carries: a dead or stalled gateway
   * connection errors instead of hanging the turn.
   */
  timeoutMs?: number;
}

/**
 * The recommended default oracle: cheap, and the only model family whose
 * capability set covers every kind the capability-aware copy can route to it
 * (the google family alone takes video and audio — the gateway catalog's
 * `vision`/`file-input` tags cover images/PDFs, and the family overlay in
 * ../model-capabilities.ts records the rest). Verified against the live
 * catalog 2026-07-07; refresh alongside model blurbs, never at build time.
 */
export const DEFAULT_MEDIA_ORACLE: LookOracleConfig = {
  model: "google/gemini-3-flash",
  modelName: "Gemini 3 Flash",
  capabilities: { image: true, pdf: true, video: true, audio: true },
};

/**
 * The consumer-facing oracle option on `createSandboxFileTools` and
 * `createSandboxFileTools`: `true` selects {@link DEFAULT_MEDIA_ORACLE}, an
 * object pins a custom oracle. Absent = no `look` tool.
 */
export type MediaOracleOption = true | LookOracleConfig;

/** Resolve the `mediaOracle` option to a concrete config (`true` → the default oracle). */
export function resolveMediaOracle(option: MediaOracleOption): LookOracleConfig {
  return option === true ? DEFAULT_MEDIA_ORACLE : option;
}

/**
 * The one generate call `look` makes, as an injectable seam (tests pass a
 * fake; the default is `ai`'s `generateText`). Only the fields the tool
 * actually sets.
 */
export type LookGenerateFn = (options: {
  model: LanguageModel;
  messages: ModelMessage[];
  headers?: Record<string, string>;
  /** Total timeout for the call, ms (the AI SDK's `timeout` setting). */
  timeoutMs: number;
  /** Cancels the oracle call when the owning turn is stopped. */
  abortSignal?: AbortSignal;
}) => Promise<{ text: string }>;

// The `ai` runtime import is LAZY and behind an opaque specifier, on purpose.
// eve bundles every authored module (each tool file) into exactly one rolldown
// chunk; a static value-import of `ai` pulls its whole graph into that bundle
// for any consumer that doesn't externalize it (`build.externalDependencies`),
// and `ai`'s CJS deps (@vercel/oidc) force rolldown to emit a second chunk —
// failing the compile with "Expected one bundled authored module" (measured on
// the Builder's Vercel deploy; its agent.ts documents the same trap for the
// runtime-ai barrel). The variable specifier keeps rolldown from resolving or
// code-splitting the import, so it stays a plain runtime `import("ai")` that
// resolves from the consumer's node_modules — and only when `look` actually
// runs. Type-only imports above are erased and safe. The `as` cast is the
// price of the opaque specifier; `look.test.ts` pins the shape.
const AI_MODULE_SPECIFIER = "ai";

const defaultGenerate: LookGenerateFn = async (options) => {
  const { generateText } = (await import(AI_MODULE_SPECIFIER)) as typeof import("ai");
  return generateText({
    model: options.model,
    messages: options.messages,
    timeout: options.timeoutMs,
    ...(options.abortSignal !== undefined ? { abortSignal: options.abortSignal } : {}),
    ...(options.headers !== undefined ? { headers: options.headers } : {}),
  });
};

/** Options for `createLookTool`: the workspace, the oracle config, and the injectable seams. */
export interface LookToolOptions {
  workspace: Workspace;
  /** What the description calls the workspace. Defaults to "workspace". */
  noun?: string;
  /**
   * The I/O backend resolved per call (see ../workspace-io.ts). Defaults to
   * the local node:fs backend; hosted agents pass the sandbox provider so
   * the oracle sees the session workspace's bytes.
   */
  io?: WorkspaceIoProvider;
  /** The oracle: model, display name, capabilities, optional headers. */
  oracle: LookOracleConfig;
  /**
   * Max file size (bytes) to send. Defaults to
   * {@link DEFAULT_LOOK_MAX_INPUT_BYTES} (the Gemini inline-data budget —
   * the binding constraint is the gateway request size, not the medium).
   */
  maxInputBytes?: number;
  /** The generate seam; defaults to `ai`'s `generateText`. */
  generateFn?: LookGenerateFn;
}

const KIND_LABELS: Record<keyof ModelInputCapabilities, string> = {
  image: "image",
  pdf: "PDF",
  video: "video",
  audio: "audio",
};

/**
 * Build the `look` tool: ask the pinned oracle model one question about a
 * media file the session's own model can't view. Sends the file's bytes and
 * the prompt in a single generate call and returns the answer as text. The
 * description carries the oracle's identity and capability set, interpolated
 * once at factory time (prompt-cache stable).
 */
export function createLookTool(opts: LookToolOptions) {
  const { workspace, oracle } = opts;
  const noun = opts.noun ?? "workspace";
  const io = opts.io ?? localIoProvider(workspace.root);
  const maxInputBytes = opts.maxInputBytes ?? DEFAULT_LOOK_MAX_INPUT_BYTES;
  const generate = opts.generateFn ?? defaultGenerate;
  const capabilityPhrase = describeCapabilities(oracle.capabilities);
  return defineTool({
    description:
      `Ask ${oracle.modelName} — a separate model that ${capabilityPhrase} — one question about a media file in the ${noun} that you cannot view yourself. ` +
      `Sends the file's bytes and your prompt in a single call and returns the model's answer as text. ` +
      `The model sees only the file and your prompt — none of your conversation — so pack the prompt with everything it needs and name the exact deliverable ` +
      `(e.g. "describe the UI layout and transcribe all visible text", "summarize what happens in this recording"). ` +
      `Text-readable files (source, PDFs-as-text, DOCX, spreadsheets) are cheaper through read; use look for pixels, video, and audio.`,
    inputSchema: z.object({
      path: z.string().min(1).describe(`Media file path, relative to the ${noun} root.`),
      prompt: z
        .string()
        .min(1)
        .describe("The question or task for the model, self-contained."),
    }),
    async execute({ path, prompt }, ctx) {
      const abs = workspace.resolve(path);
      const rel = workspace.relativize(abs);
      const fio = io(ctx);
      const stat = await fio.stat(abs);
      if (stat === null) throw new Error(`${rel} does not exist.`);
      if (!stat.isFile) {
        throw new Error(`${rel} is not a regular file. Use glob to list a directory.`);
      }
      if (stat.size > maxInputBytes) {
        throw new Error(
          `${rel} is ${stat.size} bytes — too large to send to ${oracle.modelName} (max ${maxInputBytes}).`,
        );
      }
      const buffer = await fio.readFile(abs);
      if (buffer === null) throw new Error(`${rel} does not exist.`);
      // Re-check on the bytes actually read: the file can grow between stat
      // and read (an in-progress download, an ffmpeg transcode), and the cap
      // must hold on what we send, not what we measured.
      if (buffer.length > maxInputBytes) {
        throw new Error(
          `${rel} is ${buffer.length} bytes — too large to send to ${oracle.modelName} (max ${maxInputBytes}).`,
        );
      }
      const kind = detectFileKind(buffer, rel);
      const media = mediaPartFor(kind, rel, oracle);
      const message: ModelMessage = {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "file",
            data: buffer,
            mediaType: media.mediaType,
            filename: basename(rel),
          },
        ],
      };
      const result = await generate({
        model: oracle.model,
        messages: [message],
        timeoutMs: oracle.timeoutMs ?? DEFAULT_LOOK_TIMEOUT_MS,
        ...(oracle.headers !== undefined ? { headers: oracle.headers } : {}),
        ...(ctx?.abortSignal !== undefined ? { abortSignal: ctx.abortSignal } : {}),
      });
      return {
        path: rel,
        media_type: media.mediaType,
        model: oracle.modelName,
        answer: boundAnswer(result.text),
      };
    },
  });
}

/**
 * Bound the oracle's answer for the tool result: normalize a missing/empty
 * text (a provider can finish a call with no text output — e.g. a
 * refusal-empty completion — and the injectable seam makes the shape a
 * boundary, not a compiler guarantee) and truncate past
 * {@link LOOK_MAX_ANSWER_CHARS} (tool results enter the transcript
 * permanently). Exported for tests.
 */
export function boundAnswer(text: unknown): string {
  if (typeof text !== "string" || text.length === 0) {
    return "(the model returned no answer text)";
  }
  if (text.length <= LOOK_MAX_ANSWER_CHARS) return text;
  // Don't cut through a surrogate pair: a lone surrogate in the tool result
  // breaks JSON encoding to the model API (the ../bounded-output.ts lesson).
  let cut = LOOK_MAX_ANSWER_CHARS;
  const beforeCut = text.charCodeAt(cut - 1);
  if (beforeCut >= 0xd800 && beforeCut <= 0xdbff) cut -= 1;
  return `${text.slice(0, cut)}\n… [answer truncated: showing first ${cut} of ${text.length} chars]`;
}

interface LookMediaPart {
  readonly mediaType: string;
}

/**
 * Route a detected file kind to the file part's media type, or throw the
 * honest refusal: text-readable kinds belong to `read`, and kinds outside
 * the oracle's capability set name what the oracle can view.
 */
function mediaPartFor(
  kind: ReturnType<typeof detectFileKind>,
  rel: string,
  oracle: LookOracleConfig,
): LookMediaPart {
  const refuseUnsupported = (label: keyof ModelInputCapabilities): void => {
    if (!oracle.capabilities[label]) {
      const article = label === "audio" || label === "image" ? "an" : "a";
      throw new Error(
        `${rel} is ${article} ${KIND_LABELS[label]} file, which ${oracle.modelName} cannot view — it ${describeCapabilities(oracle.capabilities)}.`,
      );
    }
  };
  switch (kind.kind) {
    case "image":
      refuseUnsupported("image");
      return { mediaType: imageMediaType(kind.format) };
    case "pdf":
      refuseUnsupported("pdf");
      return { mediaType: "application/pdf" };
    case "video":
      refuseUnsupported("video");
      return { mediaType: videoMediaType(kind.format) };
    case "audio":
      refuseUnsupported("audio");
      return { mediaType: audioMediaType(kind.format) };
    case "text":
      // Name the large-file route too: an oversize text read points here when
      // the oracle is wired (the error fires before kind detection), and
      // bouncing straight back to read would just re-refuse.
      throw new Error(
        `${rel} is a text file — read it yourself with the read tool, or extract slices with bash (head, sed -n, rg) if it is too large to read.`,
      );
    case "docx":
    case "sheet":
    case "pptx":
    case "odt":
    case "odp":
    case "epub":
    case "ipynb":
    case "rtf":
      throw new Error(
        `${rel} converts to text — read it yourself with the read tool.`,
      );
    case "binary":
      throw new Error(`${rel} is ${kind.description} — look cannot send it to a model.`);
    default: {
      // Exhaustiveness guard (assertNever, local — this package keeps zero
      // @zocomputer/* deps): a new FileKind variant fails to compile here.
      const exhausted: never = kind;
      throw new Error(`Unhandled file kind: ${JSON.stringify(exhausted)}`);
    }
  }
}

/**
 * `read`'s image-unavailable hint when a look oracle is wired: route to
 * `look` instead of the default "ask the user". `undefined` when the oracle
 * can't view images (the default hint stays honest).
 */
export function lookReadImageHint(oracle: LookOracleConfig): string | undefined {
  if (!oracle.capabilities.image) return undefined;
  return `Pass the path and a question to the look tool to have ${oracle.modelName} examine it for you.`;
}

/**
 * The "if it is …" clause naming exactly the AV kinds the oracle takes, or
 * `undefined` when it takes neither. read/webfetch share ONE
 * `mediaUnavailableHint` string across video and audio results, so a
 * one-kind oracle's hint must scope its look clause to that kind — an
 * unconditional "pass it to look" would steer the other kind into look's
 * refusal.
 */
export function lookAvKindClause(caps: ModelInputCapabilities): string | undefined {
  if (caps.video && caps.audio) return "a video or audio file";
  if (caps.video) return "a video file";
  if (caps.audio) return "an audio file";
  return undefined;
}

/**
 * `read`'s video/audio-unavailable hint when a look oracle is wired, with
 * the look clause scoped to the kinds the oracle actually takes.
 * `undefined` when the oracle views neither video nor audio.
 */
export function lookReadMediaHint(oracle: LookOracleConfig): string | undefined {
  const clause = lookAvKindClause(oracle.capabilities);
  if (clause === undefined) return undefined;
  return `If it is ${clause}, pass the path and a question to the look tool to have ${oracle.modelName} view it for you; otherwise extract what you can with bash (e.g. ffmpeg frames from a video, read as images).`;
}

/**
 * `webfetch`'s image-unavailable hint when a look oracle is wired: the image
 * is at a URL (look takes workspace paths), so the route is download-then-look.
 * `undefined` when the oracle can't view images.
 */
export function lookFetchedImageHint(oracle: LookOracleConfig): string | undefined {
  if (!oracle.capabilities.image) return undefined;
  return `Download it (e.g. bash curl -o) and pass the saved path with a question to the look tool to have ${oracle.modelName} examine it for you.`;
}

/**
 * `webfetch`'s video/audio-unavailable hint when a look oracle is wired —
 * download-then-look, like {@link lookFetchedImageHint}, with the look
 * clause scoped to the kinds the oracle actually takes
 * ({@link lookAvKindClause}) and the bash extraction fallback kept for the
 * rest. `undefined` when the oracle views neither video nor audio.
 */
export function lookFetchedMediaHint(oracle: LookOracleConfig): string | undefined {
  const clause = lookAvKindClause(oracle.capabilities);
  if (clause === undefined) return undefined;
  return `If it is ${clause}, download it (e.g. bash curl -o) and pass the saved path with a question to the look tool to have ${oracle.modelName} view it for you; otherwise extract what you can with bash (e.g. ffmpeg frames from a video, read as images).`;
}

/**
 * `read`'s file-too-large hint when a look oracle is wired. `read` rejects
 * files over its byte cap (~10 MB) before kind detection, but `look` sends up
 * to `maxInputBytes` (default {@link DEFAULT_LOOK_MAX_INPUT_BYTES}, 20 MiB) —
 * a media file in that band is reachable only through `look`, so the oversize
 * error must say so. Because the error fires before kind detection, the hint
 * leads with the text route and names the EXACT kinds `look` takes (a bare
 * "media file" invites misrouting a large text file into look's refusal) and
 * look's cap (a file above it must not bounce between two refusals).
 * `undefined` when the oracle views nothing.
 */
export function lookOversizeHint(
  oracle: LookOracleConfig,
  maxInputBytes: number = DEFAULT_LOOK_MAX_INPUT_BYTES,
): string | undefined {
  const caps = oracle.capabilities;
  const kinds = (
    [
      ["image", "image"],
      ["pdf", "PDF"],
      ["video", "video"],
      ["audio", "audio"],
    ] as const
  )
    .filter(([key]) => caps[key])
    .map(([, label]) => label);
  const first = kinds[0];
  if (first === undefined) return undefined;
  const kindList =
    kinds.length === 1
      ? first
      : `${kinds.slice(0, -1).join(", ")}, or ${kinds[kinds.length - 1]}`;
  const article = first === "image" || first === "audio" ? "an" : "a";
  const capMb = Math.floor(maxInputBytes / (1024 * 1024));
  return `For text, use bash (head, sed -n, rg) to extract the part you need. Only if it is ${article} ${kindList} file up to ${capMb} MB, pass the path and a question to the look tool to have ${oracle.modelName} examine it (look sends files read cannot; over ${capMb} MB, shrink it first, e.g. ffmpeg extraction).`;
}
