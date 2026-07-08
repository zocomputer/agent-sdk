import { Parser } from "htmlparser2";
import { openZip } from "./zip";

// OpenDocument (odt/odp) → text: both formats keep their content in one
// `content.xml`, with paragraphs as `text:p`/`text:h` and inline whitespace
// as `text:tab`/`text:line-break`/`text:s`. Presentations additionally group
// content into `draw:page` slides, which render under the same
// `=== slide N of M ===` markers as PPTX.

/** Result of ODT extraction: paragraph text or a failure reason. */
export type OdtExtraction =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly reason: string };

/**
 * Result of ODP extraction: text with explicit slide markers plus the true
 * slide count, or a failure reason.
 */
export type OdpExtraction =
  | { readonly ok: true; readonly text: string; readonly slides: number }
  | { readonly ok: false; readonly reason: string };

/** Shown in place of an ODP slide whose frames carry no text at all. */
export const ODP_EMPTY_SLIDE_NOTE =
  "[no text on this slide — likely image-only; images cannot be extracted]";

interface OdfPage {
  readonly paragraphs: string[];
}

interface OdfContent {
  /** One entry per `draw:page`; a text document's content lands in `implicit`. */
  readonly pages: OdfPage[];
  /** Paragraphs outside any `draw:page` (the whole document for ODT). */
  readonly implicit: OdfPage;
}

/**
 * Parse ODF `content.xml` into pages of paragraphs. Text documents yield
 * only the implicit page; presentations yield one page per `draw:page`.
 */
function parseContentXml(xml: string): OdfContent {
  const implicit: OdfPage = { paragraphs: [] };
  const pages: OdfPage[] = [];
  let current: OdfPage = implicit;
  let paragraph = "";
  let paragraphDepth = 0;
  const parser = new Parser(
    {
      onopentag(name, attribs) {
        if (name === "draw:page") {
          current = { paragraphs: [] };
          pages.push(current);
        } else if (name === "text:p" || name === "text:h") {
          // Paragraphs can nest (a text-box paragraph inside a list item);
          // treat the outermost as the unit.
          if (paragraphDepth === 0) paragraph = "";
          paragraphDepth++;
        } else if (paragraphDepth > 0 && name === "text:tab") {
          paragraph += "\t";
        } else if (paragraphDepth > 0 && name === "text:line-break") {
          paragraph += "\n";
        } else if (paragraphDepth > 0 && name === "text:s") {
          const count = Number(attribs["text:c"] ?? "1");
          paragraph += " ".repeat(Number.isFinite(count) && count > 0 ? count : 1);
        }
      },
      ontext(text) {
        if (paragraphDepth > 0) paragraph += text;
      },
      onclosetag(name) {
        if (name === "draw:page") {
          current = implicit;
        } else if (name === "text:p" || name === "text:h") {
          paragraphDepth--;
          if (paragraphDepth === 0) {
            const trimmed = paragraph.trim();
            if (trimmed.length > 0) current.paragraphs.push(trimmed);
            paragraph = "";
          }
        }
      },
    },
    { xmlMode: true },
  );
  parser.write(xml);
  parser.end();
  return { pages, implicit };
}

function readContentXml(bytes: Uint8Array): string {
  const zip = openZip(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  if (!zip.has("content.xml")) {
    throw new Error(
      "the package has no content.xml entry — this does not look like an OpenDocument file",
    );
  }
  return zip.read("content.xml").toString("utf8");
}

/** Extract ODT (OpenDocument text) bytes into paragraph text. */
export function extractOdt(bytes: Uint8Array): OdtExtraction {
  try {
    const content = parseContentXml(readContentXml(bytes));
    // A text document keeps everything in the implicit page, but tolerate
    // draw:page content (a .odt that's really presentation-shaped inside).
    const paragraphs = [
      ...content.implicit.paragraphs,
      ...content.pages.flatMap((page) => page.paragraphs),
    ];
    return { ok: true, text: paragraphs.join("\n") };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Extract ODP (OpenDocument presentation) bytes into text: one
 * `=== slide N of M ===` block per `draw:page`.
 */
export function extractOdp(bytes: Uint8Array): OdpExtraction {
  try {
    const content = parseContentXml(readContentXml(bytes));
    // A presentation's content lives entirely in draw:page elements; fall
    // back to the implicit page for odd files with none.
    const pages =
      content.pages.length > 0 ? content.pages : [content.implicit];
    const parts: string[] = [];
    for (const [i, page] of pages.entries()) {
      parts.push(`=== slide ${i + 1} of ${pages.length} ===`);
      parts.push(page.paragraphs.length > 0 ? page.paragraphs.join("\n") : ODP_EMPTY_SLIDE_NOTE);
    }
    return { ok: true, text: parts.join("\n"), slides: pages.length };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
