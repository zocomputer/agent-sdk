import { extname } from "node:path";

// Content-first filetype detection for the `read` tool. Magic bytes decide the
// family — an extension can lie, bytes can't — and the extension only
// disambiguates within a container family (docx/xlsx/pptx share the same zip
// magic; xls/doc/ppt share the same CFB magic; telling them apart from content
// would mean parsing container entries).

/** Image formats the read tool detects and delivers to vision models. */
export type ImageFormat = "png" | "jpeg" | "gif" | "webp";

/** The MIME type for a detected image format (for data URLs / file parts). */
export function imageMediaType(format: ImageFormat): string {
  return `image/${format}`;
}

/** Video containers `read` detects. Delivery to the model is provider-gated
 * (see the attach options on the read/webfetch factories). */
export type VideoFormat = "mp4" | "mov" | "webm" | "mkv" | "avi";

/** The MIME type for a detected video format (for data URLs / file parts). */
export function videoMediaType(format: VideoFormat): string {
  switch (format) {
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "mkv":
      return "video/x-matroska";
    case "avi":
      return "video/x-msvideo";
  }
}

/** Audio formats `read` detects. Same provider-gated delivery as video. */
export type AudioFormat = "mp3" | "wav" | "ogg" | "flac" | "m4a";

/** The MIME type for a detected audio format (for data URLs / file parts). */
export function audioMediaType(format: AudioFormat): string {
  switch (format) {
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "ogg":
      return "audio/ogg";
    case "flac":
      return "audio/flac";
    case "m4a":
      return "audio/mp4";
  }
}

/** Spreadsheet formats SheetJS parses; all route to the sheet extractor. */
export type SheetFormat = "xlsx" | "xlsm" | "xls" | "ods";

/** Text encodings `read` decodes. UTF-16 is BOM-detected (a NUL-sniff alone
 * would misclassify UTF-16 text — common in Windows-exported CSVs — as binary). */
export type TextEncoding = "utf8" | "utf16le" | "utf16be";

/** File classification by magic bytes and structure, driving read-tool content routing. */
export type FileKind =
  | { readonly kind: "text"; readonly encoding: TextEncoding }
  | { readonly kind: "pdf" }
  | { readonly kind: "docx" }
  | { readonly kind: "pptx" }
  | { readonly kind: "odt" }
  | { readonly kind: "odp" }
  | { readonly kind: "epub" }
  | { readonly kind: "ipynb" }
  | { readonly kind: "rtf" }
  | { readonly kind: "sheet"; readonly format: SheetFormat }
  | { readonly kind: "image"; readonly format: ImageFormat }
  | { readonly kind: "video"; readonly format: VideoFormat }
  | { readonly kind: "audio"; readonly format: AudioFormat }
  | { readonly kind: "binary"; readonly description: string };

// A NUL byte in the first 8 KB marks a file binary — the same heuristic git
// and ripgrep use (and read-text.ts uses for search).
const BINARY_SNIFF_BYTES = 8_192;

function startsWith(buf: Buffer, bytes: readonly number[], at = 0): boolean {
  if (buf.length < at + bytes.length) return false;
  for (const [i, b] of bytes.entries()) if (buf[at + i] !== b) return false;
  return true;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const GIF_MAGIC = [0x47, 0x49, 0x46, 0x38]; // GIF8
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46]; // RIFF
const WEBP_TAG = [0x57, 0x45, 0x42, 0x50]; // WEBP at offset 8
const AVI_TAG = [0x41, 0x56, 0x49, 0x20]; // "AVI " at offset 8
const WAVE_TAG = [0x57, 0x41, 0x56, 0x45]; // WAVE at offset 8
const FTYP_TAG = [0x66, 0x74, 0x79, 0x70]; // ftyp at offset 4 (ISO BMFF: mp4/mov/m4a/heic)
const EBML_MAGIC = [0x1a, 0x45, 0xdf, 0xa3]; // Matroska/WebM
const ID3_MAGIC = [0x49, 0x44, 0x33]; // ID3 (mp3 tag header)
const OGG_MAGIC = [0x4f, 0x67, 0x67, 0x53]; // OggS
const FLAC_MAGIC = [0x66, 0x4c, 0x61, 0x43]; // fLaC
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04
const CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // legacy Office container
const RTF_MAGIC = [0x7b, 0x5c, 0x72, 0x74, 0x66]; // {\rtf
const UTF16LE_BOM = [0xff, 0xfe];
const UTF16BE_BOM = [0xfe, 0xff];

// ISO BMFF `ftyp` major brands that are still-image containers (HEIF/AVIF),
// not video — models take png/jpeg/gif/webp, so these get an honest rejection
// steering toward conversion instead of misclassifying as mp4.
const BMFF_IMAGE_BRANDS = new Set([
  "avif",
  "avis",
  "heic",
  "heix",
  "heim",
  "heis",
  "hevc",
  "hevx",
  "mif1",
  "msf1",
]);

// `M4A `/`M4B `/`M4P ` mark audio-only MP4 containers.
const BMFF_AUDIO_BRANDS = new Set(["M4A ", "M4B ", "M4P "]);

// Audio-only MP4 extensions, the tiebreak when the brands are generic.
const BMFF_AUDIO_EXTENSIONS = new Set([".m4a", ".m4b", ".m4p"]);

// Corrupt ftyp sizes shouldn't send the brand scan across the whole file;
// real ftyp boxes are a few dozen bytes.
const BMFF_FTYP_SCAN_CAP = 256;

/**
 * Every brand in the `ftyp` box: the major brand (bytes 8–12) plus the
 * compatible-brands list (bytes 16 to the box's size, 4 bytes each). Audio
 * files often carry a generic major brand (`isom`, `mp42`) with `M4A ` only
 * in the compatible list, so classification must read all of them.
 */
function bmffBrands(buf: Buffer): string[] {
  const boxSize = buf.length >= 4 ? buf.readUInt32BE(0) : 0;
  const end = Math.min(boxSize, buf.length, BMFF_FTYP_SCAN_CAP);
  const brands = [buf.subarray(8, 12).toString("latin1")];
  for (let off = 16; off + 4 <= end; off += 4) {
    brands.push(buf.subarray(off, off + 4).toString("latin1"));
  }
  return brands;
}

/** Classify an ISO BMFF (`ftyp`) container by its brands. */
function bmffKind(buf: Buffer, path: string): FileKind {
  const brands = bmffBrands(buf);
  const major = brands[0] ?? "";
  // Like audio below, image brands can hide behind a generic major brand
  // (HEIC with major `mif1` carries `heic` in the compatible list — and
  // `mif1` itself is generic enough that some encoders bury both).
  const imageBrand = brands.find((brand) =>
    BMFF_IMAGE_BRANDS.has(brand.toLowerCase()),
  );
  if (imageBrand !== undefined) {
    return {
      kind: "binary",
      description: `an HEIF/AVIF image (brand "${imageBrand.trim()}") with no supported renderer — convert it to PNG or JPEG`,
    };
  }
  if (brands.some((brand) => BMFF_AUDIO_BRANDS.has(brand))) {
    return { kind: "audio", format: "m4a" };
  }
  if (major.startsWith("qt")) return { kind: "video", format: "mov" };
  // Generic brands (isom/iso2/mp41/mp42…) say "MP4 container", not what's
  // inside; honor an audio extension before defaulting to video.
  if (BMFF_AUDIO_EXTENSIONS.has(extname(path).toLowerCase())) {
    return { kind: "audio", format: "m4a" };
  }
  return { kind: "video", format: "mp4" };
}

/** Classify an EBML container: WebM vs generic Matroska by DocType. */
function ebmlKind(buf: Buffer): FileKind {
  // The DocType string sits in the EBML header, always within the first
  // few dozen bytes; a plain substring scan beats parsing element lengths.
  const header = buf.subarray(0, 64).toString("latin1");
  if (header.includes("webm")) return { kind: "video", format: "webm" };
  return { kind: "video", format: "mkv" };
}

function zipKind(path: string): FileKind {
  switch (extname(path).toLowerCase()) {
    case ".docx":
      return { kind: "docx" };
    case ".xlsx":
      return { kind: "sheet", format: "xlsx" };
    case ".xlsm":
      return { kind: "sheet", format: "xlsm" };
    case ".ods":
      return { kind: "sheet", format: "ods" };
    case ".pptx":
      return { kind: "pptx" };
    case ".odt":
      return { kind: "odt" };
    case ".odp":
      return { kind: "odp" };
    case ".epub":
      return { kind: "epub" };
    default:
      return { kind: "binary", description: "a zip archive" };
  }
}

function cfbKind(path: string): FileKind {
  switch (extname(path).toLowerCase()) {
    case ".xls":
      return { kind: "sheet", format: "xls" };
    case ".doc":
      return {
        kind: "binary",
        description: "a legacy Word document (.doc) with no text extractor — convert it to .docx",
      };
    case ".ppt":
      return {
        kind: "binary",
        description:
          "a legacy PowerPoint deck (.ppt) with no text extractor — convert it to .pptx",
      };
    default:
      return { kind: "binary", description: "a legacy Office (CFB) container" };
  }
}

/** Classify a file by its magic bytes and path. Magic bytes decide the family; the path disambiguates containers. */
export function detectFileKind(buf: Buffer, path: string): FileKind {
  if (startsWith(buf, PDF_MAGIC)) return { kind: "pdf" };
  if (startsWith(buf, PNG_MAGIC)) return { kind: "image", format: "png" };
  if (startsWith(buf, JPEG_MAGIC)) return { kind: "image", format: "jpeg" };
  if (startsWith(buf, GIF_MAGIC)) return { kind: "image", format: "gif" };
  if (startsWith(buf, RIFF_MAGIC)) {
    if (startsWith(buf, WEBP_TAG, 8)) return { kind: "image", format: "webp" };
    if (startsWith(buf, AVI_TAG, 8)) return { kind: "video", format: "avi" };
    if (startsWith(buf, WAVE_TAG, 8)) return { kind: "audio", format: "wav" };
    // Other RIFF payloads fall through to the NUL sniff (→ binary).
  }
  if (startsWith(buf, FTYP_TAG, 4)) return bmffKind(buf, path);
  if (startsWith(buf, EBML_MAGIC)) return ebmlKind(buf);
  if (startsWith(buf, OGG_MAGIC)) return { kind: "audio", format: "ogg" };
  if (startsWith(buf, FLAC_MAGIC)) return { kind: "audio", format: "flac" };
  if (startsWith(buf, ID3_MAGIC)) return { kind: "audio", format: "mp3" };
  // A bare MPEG frame sync (no ID3 tag) is only 11 set bits — too weak a
  // signature alone, so require the extension to agree.
  if (
    buf.length >= 2 &&
    buf[0] === 0xff &&
    ((buf[1] ?? 0) & 0xe0) === 0xe0 &&
    extname(path).toLowerCase() === ".mp3"
  ) {
    return { kind: "audio", format: "mp3" };
  }
  if (startsWith(buf, ZIP_MAGIC)) return zipKind(path);
  if (startsWith(buf, CFB_MAGIC)) return cfbKind(path);
  if (startsWith(buf, RTF_MAGIC)) return { kind: "rtf" };
  // BOM checks must precede the NUL sniff: UTF-16 text is full of NULs.
  if (startsWith(buf, UTF16LE_BOM)) return { kind: "text", encoding: "utf16le" };
  if (startsWith(buf, UTF16BE_BOM)) return { kind: "text", encoding: "utf16be" };
  if (buf.subarray(0, BINARY_SNIFF_BYTES).includes(0)) {
    return { kind: "binary", description: "binary data (unrecognized format)" };
  }
  // A notebook has no magic of its own — it's UTF-8 JSON — so the extension
  // routes it (the one text format worth structuring: raw notebook JSON
  // wastes the view budget, and one base64 output cell can blow it).
  if (extname(path).toLowerCase() === ".ipynb") return { kind: "ipynb" };
  return { kind: "text", encoding: "utf8" };
}
