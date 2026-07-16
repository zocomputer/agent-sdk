import type { MediaAssetRef, ResolvedMediaAsset } from "./media-contracts";

const ASSET_SCALAR_PREFIX = "files:";

export function formatMediaAssetRef(ref: MediaAssetRef, declarationName = "files"): string {
  assertDeclaration(ref.declarationName, declarationName);
  return `${ASSET_SCALAR_PREFIX}${normalizeMediaAssetPath(ref.path)}`;
}

export function parseMediaAssetRef(
  value: string,
  declarationName = "files",
): MediaAssetRef | null {
  if (!value.startsWith(ASSET_SCALAR_PREFIX)) return null;
  try {
    return Object.freeze({
      type: "state_asset" as const,
      declarationName,
      path: normalizeMediaAssetPath(value.slice(ASSET_SCALAR_PREFIX.length)),
    });
  } catch {
    return null;
  }
}

export function normalizeMediaAssetPath(path: string): string {
  if (path.length === 0 || path.startsWith("/") || path.includes("\\")) {
    throw new Error("media asset path must be a non-empty relative POSIX path");
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new Error("media asset path must not contain empty, . or .. segments");
  }
  return path;
}

export function assertMediaAssetRef(
  ref: MediaAssetRef,
  declarationName: string,
): MediaAssetRef {
  assertDeclaration(ref.declarationName, declarationName);
  return Object.freeze({
    type: "state_asset",
    declarationName,
    path: normalizeMediaAssetPath(ref.path),
    ...(ref.integrity === undefined ? {} : { integrity: ref.integrity }),
    ...(ref.contentType === undefined ? {} : { contentType: ref.contentType }),
    ...(ref.bytes === undefined ? {} : { bytes: ref.bytes }),
  });
}

export function sniffMediaAsset(
  ref: MediaAssetRef,
  body: Uint8Array,
): ResolvedMediaAsset | null {
  const detected = detectMediaType(body);
  if (detected === null) return null;
  return Object.freeze({
    ref: Object.freeze({ ...ref, contentType: detected.contentType, bytes: body.byteLength }),
    body,
    kind: detected.kind,
    contentType: detected.contentType,
    bytes: body.byteLength,
  });
}

function assertDeclaration(actual: string, configured: string): void {
  if (actual !== configured) {
    throw new Error(`media asset must use the configured "${configured}" files declaration`);
  }
}

function detectMediaType(
  bytes: Uint8Array,
): Pick<ResolvedMediaAsset, "kind" | "contentType"> | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return image("image/png");
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return image("image/jpeg");
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return image("image/gif");
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return image("image/webp");
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (["M4A ", "M4B ", "M4P "].includes(brand)) return audio("audio/mp4");
    return video("video/mp4");
  }
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return video("video/webm");
  if (ascii(bytes, 0, 4) === "OggS") return audio("audio/ogg");
  if (ascii(bytes, 0, 4) === "fLaC") return audio("audio/flac");
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") return audio("audio/wav");
  if (ascii(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)) return audio("audio/mpeg");
  return null;
}

function image(contentType: string) { return { kind: "image" as const, contentType }; }
function video(contentType: string) { return { kind: "video" as const, contentType }; }
function audio(contentType: string) { return { kind: "audio" as const, contentType }; }

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((byte, index) => bytes[index] === byte);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}
