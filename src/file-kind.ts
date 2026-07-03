import { extname } from "node:path";

// Content-first filetype detection for the `read` tool. Magic bytes decide the
// family — an extension can lie, bytes can't — and the extension only
// disambiguates within a container family (docx/xlsx/pptx share the same zip
// magic; xls/doc/ppt share the same CFB magic; telling them apart from content
// would mean parsing container entries).

export type ImageFormat = "png" | "jpeg" | "gif" | "webp";

/** The MIME type for a detected image format (for data URLs / file parts). */
export function imageMediaType(format: ImageFormat): string {
  return `image/${format}`;
}

/** Spreadsheet formats SheetJS parses; all route to the sheet extractor. */
export type SheetFormat = "xlsx" | "xlsm" | "xls" | "ods";

/** Text encodings `read` decodes. UTF-16 is BOM-detected (a NUL-sniff alone
 * would misclassify UTF-16 text — common in Windows-exported CSVs — as binary). */
export type TextEncoding = "utf8" | "utf16le" | "utf16be";

export type FileKind =
  | { readonly kind: "text"; readonly encoding: TextEncoding }
  | { readonly kind: "pdf" }
  | { readonly kind: "docx" }
  | { readonly kind: "sheet"; readonly format: SheetFormat }
  | { readonly kind: "image"; readonly format: ImageFormat }
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
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04
const CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // legacy Office container
const UTF16LE_BOM = [0xff, 0xfe];
const UTF16BE_BOM = [0xfe, 0xff];

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
      return { kind: "binary", description: "a PowerPoint deck (.pptx) with no text extractor" };
    case ".odt":
      return {
        kind: "binary",
        description: "an OpenDocument text file (.odt) with no text extractor",
      };
    case ".epub":
      return { kind: "binary", description: "an EPUB e-book with no text extractor" };
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

export function detectFileKind(buf: Buffer, path: string): FileKind {
  if (startsWith(buf, PDF_MAGIC)) return { kind: "pdf" };
  if (startsWith(buf, PNG_MAGIC)) return { kind: "image", format: "png" };
  if (startsWith(buf, JPEG_MAGIC)) return { kind: "image", format: "jpeg" };
  if (startsWith(buf, GIF_MAGIC)) return { kind: "image", format: "gif" };
  if (startsWith(buf, RIFF_MAGIC) && startsWith(buf, WEBP_TAG, 8)) {
    return { kind: "image", format: "webp" };
  }
  if (startsWith(buf, ZIP_MAGIC)) return zipKind(path);
  if (startsWith(buf, CFB_MAGIC)) return cfbKind(path);
  // BOM checks must precede the NUL sniff: UTF-16 text is full of NULs.
  if (startsWith(buf, UTF16LE_BOM)) return { kind: "text", encoding: "utf16le" };
  if (startsWith(buf, UTF16BE_BOM)) return { kind: "text", encoding: "utf16be" };
  if (buf.subarray(0, BINARY_SNIFF_BYTES).includes(0)) {
    return { kind: "binary", description: "binary data (unrecognized format)" };
  }
  return { kind: "text", encoding: "utf8" };
}
