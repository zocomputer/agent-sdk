import { randomUUID } from "node:crypto";

import { transcribe } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { OutputDirSchema } from "./asset-path";
import {
  audioOutputPath,
  correctionError,
  DEFAULT_INLINE_SEGMENTS,
  DEFAULT_INLINE_TRANSCRIPT_CHARS,
  resolveAudioAsset,
  createAudioPreflight,
  serializeTranscript,
  type AudioLanePreflight,
  type TranscriptSegment,
} from "./audio-lane";
import { parseMediaAssetRef } from "./media-asset";
import { warningText } from "./tool-shared";
import type { MediaInvocationLineage, MediaResult } from "./media-contracts";
import { mediaInvocationHeaders } from "./media-lineage";
import type { MediaRegistry } from "./media-registry";
import { createRuntimeStateFilesClient, DEFAULT_STATE_ASSET_DECLARATION_NAME, type StateFilesAssetStore } from "./state-files";

export const DEFAULT_TRANSCRIPTION_MODEL = "openai/whisper-1";

// The schema advertises only knobs the adapter declares and the executor honors —
// language detection is automatic, and diarization/translation have no verified
// adapter yet (add the setting + provider mapping together when one lands).
export const TranscribeAudioInputSchema = z.object({
  input_asset: z.string().trim().startsWith("files:").max(500).describe("Audio state asset, e.g. files:uploads/note.mp3."),
  model: z.string().trim().min(1).optional().describe("Transcription model id; omit to use the default."),
  output_dir: OutputDirSchema.optional().describe("Directory for a spilled transcript or captions asset."),
  output_format: z.enum(["text", "json", "srt", "vtt"]).optional().describe("Inline text or a durable transcript/captions format."),
  timestamps: z.enum(["none", "segment"]).optional().describe("Timestamp detail for segments."),
});

const SegmentSchema = z.object({ text: z.string(), startSecond: z.number(), endSecond: z.number() });
const AssetSchema = z.object({ type: z.literal("state_asset"), declarationName: z.string(), path: z.string(), contentType: z.string().optional(), bytes: z.number().optional() });
export const TranscribeAudioOutputSchema = z.object({
  detectedLanguage: z.string().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  model: z.string(),
  segments: z.array(SegmentSchema),
  transcript: z.string(),
  transcriptAsset: AssetSchema.optional(),
  truncated: z.boolean(),
  warnings: z.array(z.string()),
});

export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

export interface TranscriptionProviderRequest {
  readonly inputAsset: string;
  readonly timestamps: "none" | "segment";
}

interface TranscriptionProviderResult {
  readonly text: string;
  readonly segments: readonly TranscriptSegment[];
  readonly language?: string;
  readonly durationInSeconds?: number;
  readonly warnings: readonly unknown[];
}

export interface TranscribeAudioToolOptions {
  readonly assetStore?: StateFilesAssetStore;
  readonly declarationName?: string;
  readonly inlineCharacterLimit?: number;
  readonly inlineSegmentLimit?: number;
  readonly preflight?: AudioLanePreflight<TranscribeAudioInput, TranscriptionProviderRequest>;
  readonly registry?: () => Promise<MediaResult<MediaRegistry, string>>;
  readonly transcribe?: (model: string, audio: Uint8Array, request: TranscriptionProviderRequest, lineage?: MediaInvocationLineage) => Promise<TranscriptionProviderResult>;
  readonly randomId?: () => string;
}

async function defaultTranscribe(model: string, audio: Uint8Array, _request: TranscriptionProviderRequest, lineage?: MediaInvocationLineage): Promise<TranscriptionProviderResult> {
  const result = await transcribe({ model: zoGateway().transcriptionModel(model), audio, headers: { [ZO_TOOL_HEADER]: "transcribe_audio", ...(lineage === undefined ? {} : mediaInvocationHeaders(lineage)) } });
  return {
    text: result.text,
    segments: result.segments,
    ...(result.language === undefined ? {} : { language: result.language }),
    ...(result.durationInSeconds === undefined ? {} : { durationInSeconds: result.durationInSeconds }),
    warnings: result.warnings,
  };
}

export function transcribeAudioTool(options: TranscribeAudioToolOptions = {}) {
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const store = options.assetStore ?? createRuntimeStateFilesClient({ declarationName });
  const preflight = options.preflight ?? createAudioPreflight({
    operation: "audio.transcribe",
    defaultModel: DEFAULT_TRANSCRIPTION_MODEL,
    assetStore: store,
    ...(options.registry === undefined ? {} : { registry: options.registry }),
    mapRequest: (input: TranscribeAudioInput) => ({ inputAsset: input.input_asset, timestamps: input.timestamps ?? "segment" }),
  });
  const runProvider = options.transcribe ?? defaultTranscribe;
  const randomId = options.randomId ?? (() => randomUUID().slice(0, 8));
  const characterLimit = options.inlineCharacterLimit ?? DEFAULT_INLINE_TRANSCRIPT_CHARS;
  const segmentLimit = options.inlineSegmentLimit ?? DEFAULT_INLINE_SEGMENTS;

  return defineTool({
    description: "Transcribe a bounded audio state asset; long transcripts spill to a durable JSON, SRT, or VTT asset.",
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
    async execute(input) {
      const checked = await preflight(input);
      if (!checked.ok) throw correctionError(checked.error);
      const prefetched = checked.value.resolvedAssets?.[0];
      const ref = parseMediaAssetRef(checked.value.request.inputAsset, declarationName);
      if (ref === null) throw new Error("Preflight returned an invalid audio asset reference; no provider request was made.");
      const asset = prefetched ?? await resolveAudioAsset(store, ref);
      const result = await runProvider(checked.value.model, asset.body, checked.value.request, checked.value.lineage);
      const selectedSegments = checked.value.request.timestamps === "none" ? [] : result.segments;
      const outputFormat = input.output_format ?? "text";
      const shouldSpill = outputFormat !== "text" || result.text.length > characterLimit || selectedSegments.length > segmentLimit;
      let transcriptAsset;
      if (shouldSpill) {
        const spillFormat = outputFormat === "text" ? "json" : outputFormat;
        const serialized = serializeTranscript(spillFormat, result.text, selectedSegments);
        const path = audioOutputPath({ ...(input.output_dir === undefined ? {} : { outputDir: input.output_dir }), stem: "transcript", id: randomId(), extension: serialized.extension });
        transcriptAsset = await store.write(path, serialized.body, { contentType: serialized.contentType });
      }
      return {
        ...(result.language === undefined ? {} : { detectedLanguage: result.language }),
        ...(result.durationInSeconds === undefined ? {} : { durationSeconds: result.durationInSeconds }),
        model: checked.value.model,
        segments: selectedSegments.slice(0, segmentLimit),
        transcript: result.text.slice(0, characterLimit),
        ...(transcriptAsset === undefined ? {} : { transcriptAsset }),
        truncated: result.text.length > characterLimit || selectedSegments.length > segmentLimit,
        warnings: result.warnings.map(warningText),
      };
    },
    toModelOutput(output) {
      const spill = output.transcriptAsset === undefined ? "" : ` Full transcript: ${output.transcriptAsset.declarationName}:${output.transcriptAsset.path}.`;
      return { type: "text", value: `${output.transcript}${spill}` };
    },
  });
}

export default transcribeAudioTool();
