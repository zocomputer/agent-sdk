import { randomUUID } from "node:crypto";

import { generateSpeech } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { OutputDirSchema } from "./asset-path";
import { audioOutputPath, correctionError, createAudioPreflight, type AudioLanePreflight } from "./audio-lane";
import type { MediaInvocationLineage, MediaResult } from "./media-contracts";
import { mediaInvocationHeaders } from "./media-lineage";
import type { MediaRegistry } from "./media-registry";
import { StateAssetReferenceSchema, warningText } from "./tool-shared";
import { createRuntimeStateFilesClient, DEFAULT_STATE_ASSET_DECLARATION_NAME, type StateFilesAssetWriter } from "./state-files";

export const DEFAULT_SPEECH_MODEL = "openai/tts-1";

export const GenerateSpeechInputSchema = z.object({
  format: z.enum(["mp3", "wav"]).optional().describe("Audio format; omit for the model default."),
  language: z.string().trim().min(2).max(16).optional().describe("ISO language code or 'auto', when supported."),
  model: z.string().trim().min(1).optional().describe("Speech model id; omit to use the default."),
  output_dir: OutputDirSchema.optional().describe("Relative state-file output directory."),
  speed: z.number().min(0.25).max(4).optional().describe("Speaking speed, when supported."),
  style: z.string().trim().min(1).max(500).optional().describe("Short delivery or expression instruction, when supported."),
  text: z.string().trim().min(1).max(100_000).describe("Text to speak."),
  voice: z.string().trim().min(1).max(100).optional().describe("Voice id from media_models."),
});

const EstimateSchema = z.discriminatedUnion("confidence", [
  z.object({ confidence: z.literal("exact"), amountUsd: z.number().nonnegative() }),
  z.object({ confidence: z.literal("range"), minUsd: z.number().nonnegative(), maxUsd: z.number().nonnegative() }),
  z.object({ confidence: z.literal("unknown") }),
]);

export const GenerateSpeechOutputSchema = z.object({
  asset: StateAssetReferenceSchema,
  bytes: z.number().int().nonnegative(),
  estimate: EstimateSchema,
  format: z.string(),
  mediaType: z.string(),
  model: z.string(),
  path: z.string(),
  warnings: z.array(z.string()),
});

export type GenerateSpeechInput = z.infer<typeof GenerateSpeechInputSchema>;

export interface SpeechProviderRequest {
  readonly text: string;
  readonly voice?: string;
  readonly format?: "mp3" | "wav";
  readonly language?: string;
  readonly speed?: number;
  readonly style?: string;
}

interface SpeechProviderResult {
  readonly audio: { readonly mediaType: string; readonly uint8Array: Uint8Array; readonly format: string };
  readonly warnings: readonly unknown[];
}

export interface GenerateSpeechToolOptions {
  readonly assetWriter?: StateFilesAssetWriter;
  readonly declarationName?: string;
  readonly preflight?: AudioLanePreflight<GenerateSpeechInput, SpeechProviderRequest>;
  readonly registry?: () => Promise<MediaResult<MediaRegistry, string>>;
  readonly generate?: (model: string, request: SpeechProviderRequest, lineage?: MediaInvocationLineage) => Promise<SpeechProviderResult>;
  readonly randomId?: () => string;
}

async function defaultGenerate(model: string, request: SpeechProviderRequest, lineage?: MediaInvocationLineage): Promise<SpeechProviderResult> {
  return generateSpeech({
    model: zoGateway().speechModel(model),
    text: request.text,
    headers: { [ZO_TOOL_HEADER]: "generate_speech", ...(lineage === undefined ? {} : mediaInvocationHeaders(lineage)) },
    ...(request.voice === undefined ? {} : { voice: request.voice }),
    ...(request.format === undefined ? {} : { outputFormat: request.format }),
    ...(request.language === undefined ? {} : { language: request.language }),
    ...(request.speed === undefined ? {} : { speed: request.speed }),
    ...(request.style === undefined ? {} : { instructions: request.style }),
  });
}

export function generateSpeechTool(options: GenerateSpeechToolOptions = {}) {
  const declarationName = options.declarationName ?? DEFAULT_STATE_ASSET_DECLARATION_NAME;
  const writer = options.assetWriter ?? createRuntimeStateFilesClient({ declarationName });
  const preflight = options.preflight ?? createAudioPreflight({
    operation: "speech.generate",
    defaultModel: DEFAULT_SPEECH_MODEL,
    ...(options.registry === undefined ? {} : { registry: options.registry }),
    mapRequest: (input: GenerateSpeechInput) => ({ text: input.text, ...(input.voice === undefined ? {} : { voice: input.voice }), ...(input.format === undefined ? {} : { format: input.format }), ...(input.language === undefined ? {} : { language: input.language }), ...(input.speed === undefined ? {} : { speed: input.speed }), ...(input.style === undefined ? {} : { style: input.style }) }),
  });
  const generate = options.generate ?? defaultGenerate;
  const randomId = options.randomId ?? (() => randomUUID().slice(0, 8));
  return defineTool({
    description: "Generate speech with a catalog-supported voice and save it as an audio state asset.",
    inputSchema: GenerateSpeechInputSchema,
    outputSchema: GenerateSpeechOutputSchema,
    async execute(input) {
      const checked = await preflight(input);
      if (!checked.ok) throw correctionError(checked.error);
      const result = await generate(checked.value.model, checked.value.request, checked.value.lineage);
      const extension = result.audio.format || input.format || "mp3";
      const path = audioOutputPath({ ...(input.output_dir === undefined ? {} : { outputDir: input.output_dir }), stem: input.text, id: randomId(), extension });
      const asset = await writer.write(path, result.audio.uint8Array, { contentType: result.audio.mediaType });
      return { asset, bytes: result.audio.uint8Array.byteLength, estimate: checked.value.estimate, format: result.audio.format, mediaType: result.audio.mediaType, model: checked.value.model, path, warnings: result.warnings.map(warningText) };
    },
    toModelOutput(output) {
      return { type: "text", value: `Generated speech saved as ${output.asset.declarationName}:${output.asset.path} (${output.format}, ${output.bytes} bytes).` };
    },
  });
}

export default generateSpeechTool();
