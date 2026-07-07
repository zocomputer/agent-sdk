import { imageSize } from "image-size";
import {
  type AudioFormat,
  detectFileKind,
  type ImageFormat,
  type SheetFormat,
  type TextEncoding,
  type VideoFormat,
} from "./file-kind";
import { createStatCache, type StatIdentity } from "./extract/cache";
import { extractDocx } from "./extract/docx";
import { extractPdf } from "./extract/pdf";
import { extractSheets, type SheetMeta } from "./extract/sheet";

// Content routing for the `read` tool: sniff the bytes, then hand back either
// the text to window (native or extracted from PDF/DOCX/spreadsheets),
// image/video/audio metadata, or a thrown error for binaries with no text
// rendering. Kept free of the workspace module so tests can feed fixture
// paths directly.

/** Content routed by detected file kind: text (native or extracted), image/video/audio metadata, or a thrown error for unsupported binaries. */
export type FileContent =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "pdf"; readonly text: string; readonly pages: number }
  | { readonly kind: "docx"; readonly text: string }
  | {
      readonly kind: "sheet";
      readonly format: SheetFormat;
      readonly text: string;
      readonly sheets: readonly SheetMeta[];
    }
  | {
      readonly kind: "image";
      readonly format: ImageFormat;
      readonly width: number | null;
      readonly height: number | null;
    }
  | { readonly kind: "video"; readonly format: VideoFormat }
  | { readonly kind: "audio"; readonly format: AudioFormat };

type ExtractedDoc = Exclude<FileContent, { kind: "text" } | { kind: "image" }>;
type ExtractableKind =
  | { readonly kind: "pdf" }
  | { readonly kind: "docx" }
  | { readonly kind: "sheet"; readonly format: SheetFormat };

// Extraction is pure parsing, so cache by path + stat identity: re-reading a
// PDF to page through it (offset/limit) shouldn't re-run PDFium every call.
// Failures throw out of `compute` and are never cached.
const EXTRACTION_CACHE_LIMIT = 20;
const extractionCache = createStatCache<ExtractedDoc>(EXTRACTION_CACHE_LIMIT);

function decodeText(buffer: Buffer, encoding: TextEncoding): string {
  switch (encoding) {
    case "utf8":
      return buffer.toString("utf8");
    case "utf16le":
      // Strip the BOM the detector matched on; it isn't content.
      return buffer.toString("utf16le").replace(/^\uFEFF/, "");
    case "utf16be": {
      // Node has no utf16be decoder; byte-swap a copy and decode as LE.
      const swapped = Buffer.from(buffer).swap16();
      return swapped.toString("utf16le").replace(/^\uFEFF/, "");
    }
  }
}

async function extractDocument(
  detected: ExtractableKind,
  buffer: Buffer,
  path: string,
): Promise<ExtractedDoc> {
  switch (detected.kind) {
    case "pdf": {
      const result = await extractPdf(buffer);
      if (!result.ok) throw new Error(`Could not extract text from PDF ${path}: ${result.reason}`);
      return { kind: "pdf", text: result.text, pages: result.pages };
    }
    case "docx": {
      const result = await extractDocx(buffer);
      if (!result.ok) {
        throw new Error(`Could not extract text from DOCX ${path}: ${result.reason}`);
      }
      return { kind: "docx", text: result.text };
    }
    case "sheet": {
      const result = extractSheets(buffer);
      if (!result.ok) {
        throw new Error(`Could not extract data from spreadsheet ${path}: ${result.reason}`);
      }
      return { kind: "sheet", format: detected.format, text: result.text, sheets: result.sheets };
    }
  }
}

/**
 * Route a file's bytes to renderable content. `path` labels error messages,
 * disambiguates container formats by extension, and keys the extraction cache.
 * Throws for binaries with no text rendering (the tool-error path).
 */
export async function loadFileContent(
  buffer: Buffer,
  path: string,
  id: StatIdentity,
): Promise<FileContent> {
  const detected = detectFileKind(buffer, path);
  switch (detected.kind) {
    case "text":
      return { kind: "text", text: decodeText(buffer, detected.encoding) };
    case "pdf":
    case "docx":
    case "sheet":
      return extractionCache.get(path, id, () => extractDocument(detected, buffer, path));
    case "image": {
      // Magic bytes matched but the body may still be truncated/corrupt —
      // dimensions are best-effort, the metadata result is useful either way.
      let size: { width: number; height: number } | null = null;
      try {
        size = imageSize(buffer);
      } catch {
        size = null;
      }
      return {
        kind: "image",
        format: detected.format,
        width: size?.width ?? null,
        height: size?.height ?? null,
      };
    }
    // No probing for duration/dimensions — container parsing isn't worth a
    // dep; the metadata result carries format + size and the bytes ride the
    // attachment contract when the consumer opted in.
    case "video":
      return { kind: "video", format: detected.format };
    case "audio":
      return { kind: "audio", format: detected.format };
    case "binary":
      throw new Error(
        `${path} is ${detected.description} — read returns text only. ` +
          "Use bash (unzip -l, strings, xxd) to inspect it if needed.",
      );
  }
}
