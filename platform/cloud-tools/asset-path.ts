import { z } from "zod";

export const DEFAULT_ASSET_OUTPUT_DIR = "generated";

// A relative state-file directory: no leading/trailing slash, no empty, `.` or `..`
// segments. Shared by the media-generating tools' inputs (image, video).
export const OutputDirSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(
    /^(?!\/)(?!.*\/$)(?!.*\/\/)(?!.*(?:^|\/)(?:\.|\.\.)(?:\/|$))[A-Za-z0-9._/-]+$/u,
    "Use a relative state file path without empty, . or .. segments.",
  );

const MEDIA_TYPE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function extensionForMediaType(mediaType: string): string {
  return MEDIA_TYPE_EXTENSIONS[mediaType] ?? "bin";
}

export function slugForPrompt(prompt: string, fallback = "asset"): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug.length > 0 ? slug : fallback;
}

export interface AssetPathInput {
  readonly id: string;
  readonly mediaType: string;
  readonly outputDir?: string | null | undefined;
  readonly prompt: string;
  // Slug used when the prompt has no filename-safe characters (e.g. "image", "video").
  readonly fallbackSlug?: string;
}

function normalizedOutputDir(outputDir: string | null | undefined): string {
  const trimmed = outputDir?.trim();
  const dir = trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ASSET_OUTPUT_DIR;
  const withoutTrailingSlash = dir.replace(/\/+$/g, "");

  return withoutTrailingSlash.length > 0
    ? withoutTrailingSlash
    : DEFAULT_ASSET_OUTPUT_DIR;
}

export function assetOutputPath(input: AssetPathInput): string {
  return `${normalizedOutputDir(input.outputDir)}/${slugForPrompt(input.prompt, input.fallbackSlug)}-${
    input.id
  }.${extensionForMediaType(input.mediaType)}`;
}
