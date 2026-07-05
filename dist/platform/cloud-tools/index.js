// ../../../../../tmp/agent-sdk-mirror-OMj3Gv/repo/platform/cloud-tools/image.ts
import { randomUUID } from "node:crypto";
import { ReadableStream } from "node:stream/web";
import { generateImage } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

// ../../../../../tmp/agent-sdk-mirror-OMj3Gv/repo/platform/runtime-ai/gateway.ts
import { createGateway } from "ai";

// ../../../../../tmp/agent-sdk-mirror-OMj3Gv/repo/platform/runtime-ai/session-fetch.ts
var EVE_SESSION_HEADER = "x-zo-eve-session";
var EVE_CONTEXT_STORAGE_KEY = Symbol.for("eve.context-storage");
var SESSION_ID_KEY_NAME = "eve.sessionId";
function hasMethod(value, name) {
  return typeof value === "object" && value !== null && typeof value[name] === "function";
}
function ambientEveSessionId() {
  const storage = Reflect.get(globalThis, EVE_CONTEXT_STORAGE_KEY);
  if (!hasMethod(storage, "getStore"))
    return;
  const store = storage.getStore();
  if (!hasMethod(store, "get"))
    return;
  const value = store.get({ name: SESSION_ID_KEY_NAME });
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
function eveSessionFetch(getSessionId = ambientEveSessionId, baseFetch = globalThis.fetch) {
  return Object.assign((input, init) => {
    const sessionId = getSessionId()?.trim();
    if (!sessionId)
      return baseFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set(EVE_SESSION_HEADER, sessionId);
    return baseFetch(input, { ...init, headers });
  }, baseFetch);
}

// ../../../../../tmp/agent-sdk-mirror-OMj3Gv/repo/platform/runtime-ai/gateway.ts
var ZO_TOOL_HEADER = "x-zo-tool";
var DEFAULT_ZO_AI_BASE_URL = "http://localhost:4000/runtime/ai/v4/ai";
var DEFAULT_ZO_AI_KEY = "dev-proxy";
function resolveZoGatewayBaseUrl(baseURL = process.env.ZO_AI_BASE_URL) {
  const trimmed = baseURL?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_BASE_URL;
}
function resolveZoGatewayApiKey(apiKey = process.env.ZO_AI_KEY) {
  const trimmed = apiKey?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_KEY;
}
function zoGateway(options = {}) {
  return createGateway({
    ...options,
    apiKey: resolveZoGatewayApiKey(options.apiKey),
    baseURL: resolveZoGatewayBaseUrl(options.baseURL),
    fetch: eveSessionFetch(undefined, options.fetch)
  });
}
// ../../../../../tmp/agent-sdk-mirror-OMj3Gv/repo/platform/cloud-tools/image-path.ts
var DEFAULT_IMAGE_OUTPUT_DIR = "generated";
var MEDIA_TYPE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};
function extensionForMediaType(mediaType) {
  return MEDIA_TYPE_EXTENSIONS[mediaType] ?? "bin";
}
function slugForPrompt(prompt) {
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return slug.length > 0 ? slug : "image";
}
function normalizedOutputDir(outputDir) {
  const trimmed = outputDir?.trim();
  const dir = trimmed && trimmed.length > 0 ? trimmed : DEFAULT_IMAGE_OUTPUT_DIR;
  const withoutTrailingSlash = dir.replace(/\/+$/g, "");
  return withoutTrailingSlash.length > 0 ? withoutTrailingSlash : DEFAULT_IMAGE_OUTPUT_DIR;
}
function imageOutputPath(input) {
  return `${normalizedOutputDir(input.outputDir)}/${slugForPrompt(input.prompt)}-${input.id}.${extensionForMediaType(input.mediaType)}`;
}

// ../../../../../tmp/agent-sdk-mirror-OMj3Gv/repo/platform/cloud-tools/image.ts
var DEFAULT_IMAGE_MODEL = "bfl/flux-2-pro";
function isImageSize(value) {
  return typeof value === "string" && /^[1-9]\d{1,4}x[1-9]\d{1,4}$/u.test(value);
}
function isImageAspectRatio(value) {
  return typeof value === "string" && /^[1-9]\d{0,2}:[1-9]\d{0,2}$/u.test(value);
}
var SizeSchema = z.templateLiteral([z.number().int().positive(), "x", z.number().int().positive()]).refine(isImageSize, { message: "Use WIDTHxHEIGHT, for example 1024x1024." });
var AspectRatioSchema = z.templateLiteral([z.number().int().positive(), ":", z.number().int().positive()]).refine(isImageAspectRatio, { message: "Use WIDTH:HEIGHT, for example 1:1 or 16:9." });
var ImageDimensionsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("auto") }).strict(),
  z.object({ kind: z.literal("size"), size: SizeSchema }).strict(),
  z.object({
    aspectRatio: AspectRatioSchema,
    kind: z.literal("aspectRatio")
  }).strict()
]);
var OutputDirSchema = z.string().trim().min(1).max(200).regex(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/u, "Use a relative workspace path without .. segments.");
var GenerateImageInputSchema = z.object({
  dimensions: ImageDimensionsSchema.optional(),
  model: z.string().trim().min(1).optional(),
  outputDir: OutputDirSchema.optional(),
  prompt: z.string().trim().min(1).max(4000),
  seed: z.number().int().nonnegative().optional()
}).strict();
var GenerateImageOutputSchema = z.object({
  bytes: z.number().int().nonnegative(),
  mediaType: z.string(),
  model: z.string(),
  path: z.string(),
  prompt: z.string(),
  warnings: z.array(z.string())
}).strict();
function assertNever(value) {
  throw new Error(`Unhandled generate_image dimensions: ${JSON.stringify(value)}`);
}
function imageDimensionSettings(dimensions) {
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
function warningText(warning) {
  if (warning instanceof Error) {
    return warning.message;
  }
  if (typeof warning === "string") {
    return warning;
  }
  return JSON.stringify(warning) ?? String(warning);
}
function randomImageId() {
  return randomUUID().slice(0, 8);
}
function streamFromBytes(bytes) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
}
function generateImageTool() {
  return defineTool({
    description: "Generate an image from a text prompt and save it into the workspace.",
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
    async execute(input, ctx) {
      const model = input.model ?? DEFAULT_IMAGE_MODEL;
      const result = await generateImage({
        headers: { [ZO_TOOL_HEADER]: "generate_image" },
        model: zoGateway().imageModel(model),
        prompt: input.prompt,
        ...imageDimensionSettings(input.dimensions),
        ...input.seed === undefined ? {} : { seed: input.seed }
      });
      const image = result.image;
      const path = imageOutputPath({
        id: randomImageId(),
        mediaType: image.mediaType,
        outputDir: input.outputDir,
        prompt: input.prompt
      });
      const sandbox = await ctx.getSandbox();
      await sandbox.writeFile({ content: streamFromBytes(image.uint8Array), path });
      return {
        bytes: image.uint8Array.byteLength,
        mediaType: image.mediaType,
        model,
        path,
        prompt: input.prompt,
        warnings: result.warnings.map(warningText)
      };
    },
    toModelOutput(output) {
      return {
        type: "text",
        value: `Generated image saved to ${output.path}. ` + `The chat interface cannot display workspace images yet — do not embed this ` + `path as a markdown image (it will render as a blocked placeholder). ` + `Just tell the user the image was generated and where it is saved.`
      };
    }
  });
}
var image_default = generateImageTool();
// ../../../../../tmp/agent-sdk-mirror-OMj3Gv/repo/platform/cloud-tools/web-search.ts
function webSearch(config) {
  const gateway = zoGateway();
  return config === undefined ? gateway.tools.exaSearch() : gateway.tools.exaSearch(config);
}
export {
  webSearch,
  generateImageTool,
  image_default as generateImage,
  GenerateImageOutputSchema,
  GenerateImageInputSchema,
  DEFAULT_IMAGE_MODEL
};
