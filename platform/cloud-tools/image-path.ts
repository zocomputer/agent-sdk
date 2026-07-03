export const DEFAULT_IMAGE_OUTPUT_DIR = "generated";

const MEDIA_TYPE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensionForMediaType(mediaType: string): string {
  return MEDIA_TYPE_EXTENSIONS[mediaType] ?? "bin";
}

export function slugForPrompt(prompt: string): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug.length > 0 ? slug : "image";
}

export interface ImagePathInput {
  readonly id: string;
  readonly mediaType: string;
  readonly outputDir?: string | null;
  readonly prompt: string;
}

function normalizedOutputDir(outputDir: string | null | undefined): string {
  const trimmed = outputDir?.trim();
  const dir = trimmed && trimmed.length > 0 ? trimmed : DEFAULT_IMAGE_OUTPUT_DIR;
  const withoutTrailingSlash = dir.replace(/\/+$/g, "");

  return withoutTrailingSlash.length > 0
    ? withoutTrailingSlash
    : DEFAULT_IMAGE_OUTPUT_DIR;
}

export function imageOutputPath(input: ImagePathInput): string {
  return `${normalizedOutputDir(input.outputDir)}/${slugForPrompt(input.prompt)}-${
    input.id
  }.${extensionForMediaType(input.mediaType)}`;
}
