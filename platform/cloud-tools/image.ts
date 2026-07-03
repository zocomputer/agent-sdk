import { randomUUID } from "node:crypto";
import { ReadableStream } from "node:stream/web";

import { generateImage } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { ZO_TOOL_HEADER, zoGateway } from "../runtime-ai/index.ts";
import { imageOutputPath } from "./image-path";

export const DEFAULT_IMAGE_MODEL = "bfl/flux-2-pro";

type ImageSize = `${number}x${number}`;
type ImageAspectRatio = `${number}:${number}`;

function isImageSize(value: unknown): value is ImageSize {
  return (
    typeof value === "string" &&
    /^[1-9]\d{1,4}x[1-9]\d{1,4}$/u.test(value)
  );
}

function isImageAspectRatio(value: unknown): value is ImageAspectRatio {
  return (
    typeof value === "string" &&
    /^[1-9]\d{0,2}:[1-9]\d{0,2}$/u.test(value)
  );
}

// z.templateLiteral (never z.custom): eve converts tool input schemas to JSON Schema
// with zod's toJSONSchema, which throws on z.custom — an agent with this tool would
// fail to boot. templateLiteral emits a string+pattern schema and keeps the
// template-literal types; the refine keeps the stricter bounds the pattern alone
// can't express (runtime-only, invisible to JSON Schema).
const SizeSchema = z
  .templateLiteral([z.number().int().positive(), "x", z.number().int().positive()])
  .refine(isImageSize, { message: "Use WIDTHxHEIGHT, for example 1024x1024." });

const AspectRatioSchema = z
  .templateLiteral([z.number().int().positive(), ":", z.number().int().positive()])
  .refine(isImageAspectRatio, { message: "Use WIDTH:HEIGHT, for example 1:1 or 16:9." });

const ImageDimensionsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("auto") }).strict(),
  z.object({ kind: z.literal("size"), size: SizeSchema }).strict(),
  z
    .object({
      aspectRatio: AspectRatioSchema,
      kind: z.literal("aspectRatio"),
    })
    .strict(),
]);

const OutputDirSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(
    /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/u,
    "Use a relative workspace path without .. segments.",
  );

export const GenerateImageInputSchema = z
  .object({
    dimensions: ImageDimensionsSchema.optional(),
    model: z.string().trim().min(1).optional(),
    outputDir: OutputDirSchema.optional(),
    prompt: z.string().trim().min(1).max(4000),
    seed: z.number().int().nonnegative().optional(),
  })
  .strict();

export const GenerateImageOutputSchema = z
  .object({
    bytes: z.number().int().nonnegative(),
    mediaType: z.string(),
    model: z.string(),
    path: z.string(),
    prompt: z.string(),
    warnings: z.array(z.string()),
  })
  .strict();

export type GenerateImageDimensions = z.infer<typeof ImageDimensionsSchema>;
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

interface ImageDimensionSettings {
  readonly aspectRatio?: ImageAspectRatio;
  readonly size?: ImageSize;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled generate_image dimensions: ${JSON.stringify(value)}`);
}

function imageDimensionSettings(
  dimensions: GenerateImageDimensions | undefined,
): ImageDimensionSettings {
  if (dimensions === undefined || dimensions.kind === "auto") {
    return {};
  }

  switch (dimensions.kind) {
    case "aspectRatio":
      return { aspectRatio: dimensions.aspectRatio };
    case "size":
      return { size: dimensions.size };
    default:
      return assertNever(dimensions);
  }
}

function warningText(warning: unknown): string {
  if (warning instanceof Error) {
    return warning.message;
  }
  if (typeof warning === "string") {
    return warning;
  }

  return JSON.stringify(warning) ?? String(warning);
}

function randomImageId(): string {
  return randomUUID().slice(0, 8);
}

function streamFromBytes(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

export function generateImageTool() {
  return defineTool({
    description: "Generate an image from a text prompt and save it into the workspace.",
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
    async execute(input, ctx): Promise<GenerateImageOutput> {
      const model = input.model ?? DEFAULT_IMAGE_MODEL;
      const result = await generateImage({
        headers: { [ZO_TOOL_HEADER]: "generate_image" },
        model: zoGateway().imageModel(model),
        prompt: input.prompt,
        ...imageDimensionSettings(input.dimensions),
        ...(input.seed === undefined ? {} : { seed: input.seed }),
      });
      const image = result.image;
      const path = imageOutputPath({
        id: randomImageId(),
        mediaType: image.mediaType,
        outputDir: input.outputDir,
        prompt: input.prompt,
      });

      const sandbox = await ctx.getSandbox();
      await sandbox.writeFile({ content: streamFromBytes(image.uint8Array), path });

      return {
        bytes: image.uint8Array.byteLength,
        mediaType: image.mediaType,
        model,
        path,
        prompt: input.prompt,
        warnings: result.warnings.map(warningText),
      };
    },
    toModelOutput(output) {
      // The chat UI can't display workspace files yet: nothing serves the sandbox over
      // HTTP, and the markdown renderer blocks a bare workspace path outright (it renders
      // as "[Image blocked: …]"). Say so explicitly, or the model embeds the path as a
      // markdown image and the user sees the blocked placeholder. How generated images
      // reach the chat (blob upload → URL, a served-files route, or transcript
      // attachments) is still an open decision — see the display note in
      // plans/ray/built-in-cloud-tools-design.md.
      return {
        type: "text",
        value:
          `Generated image saved to ${output.path}. ` +
          `The chat interface cannot display workspace images yet — do not embed this ` +
          `path as a markdown image (it will render as a blocked placeholder). ` +
          `Just tell the user the image was generated and where it is saved.`,
      };
    },
  });
}

export default generateImageTool();
