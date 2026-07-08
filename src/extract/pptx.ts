import { Parser } from "htmlparser2";
import { openZip, type ZipArchive } from "./zip";

// PPTX → text: slide text runs (`a:t` inside `a:p` paragraphs, `a:br` line
// breaks) joined under explicit `=== slide N of M ===` markers, with each
// slide's speaker notes appended under a `[speaker notes]` line. The same
// shape as PDF extraction, so `read`'s offset/limit pagination and the
// model's slide citations work identically.

/**
 * Result of PPTX extraction: text with explicit slide markers plus the true
 * slide count (which may exceed extracted slides if the cap bit), or a
 * failure reason.
 */
export type PptxExtraction =
  | { readonly ok: true; readonly text: string; readonly slides: number }
  | { readonly ok: false; readonly reason: string };

/** Shown in place of a slide whose shapes carry no text at all. */
export const PPTX_EMPTY_SLIDE_NOTE =
  "[no text on this slide — likely image-only; images cannot be extracted]";

/**
 * Extraction slide cap. Read's view budget paginates the text; this bounds
 * the extraction work itself. `slides` still reports the true total.
 */
export const PPTX_SLIDE_CAP = 200;

/**
 * Collect the visible paragraphs of one slide (or notes-slide) XML part:
 * `a:t` runs concatenated within their `a:p` paragraph, `a:br` as a line
 * break. Empty paragraphs are dropped.
 */
export function slideParagraphs(xml: string): string[] {
  const paragraphs: string[] = [];
  let current = "";
  let inParagraph = false;
  let inText = false;
  const parser = new Parser(
    {
      onopentag(name) {
        if (name === "a:p") {
          inParagraph = true;
          current = "";
        } else if (name === "a:t") {
          inText = true;
        } else if (name === "a:br" && inParagraph) {
          current += "\n";
        }
      },
      ontext(text) {
        if (inText) current += text;
      },
      onclosetag(name) {
        if (name === "a:t") {
          inText = false;
        } else if (name === "a:p") {
          inParagraph = false;
          const trimmed = current.trim();
          if (trimmed.length > 0) paragraphs.push(trimmed);
          current = "";
        }
      },
    },
    { xmlMode: true },
  );
  parser.write(xml);
  parser.end();
  return paragraphs;
}

const SLIDE_ENTRY = /^ppt\/slides\/slide(\d+)\.xml$/;

/** Resolve a rels Target (relative to `ppt/`, or package-absolute) to an entry name. */
function resolveSlideTarget(target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = `ppt/${target}`.split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return resolved.join("/");
}

/** The relationship Id → resolved entry name map from `ppt/_rels/presentation.xml.rels`. */
function presentationRelTargets(xml: string): Map<string, string> {
  const targets = new Map<string, string>();
  const parser = new Parser(
    {
      onopentag(name, attribs) {
        if (name !== "Relationship") return;
        const id = attribs["Id"];
        const target = attribs["Target"];
        if (id !== undefined && target !== undefined) {
          targets.set(id, resolveSlideTarget(target));
        }
      },
    },
    { xmlMode: true },
  );
  parser.write(xml);
  parser.end();
  return targets;
}

/** The `r:id` refs of `presentation.xml`'s slide list, in presentation order. */
function slideIdOrder(xml: string): string[] {
  const ids: string[] = [];
  let inList = false;
  const parser = new Parser(
    {
      onopentag(name, attribs) {
        if (name === "p:sldIdLst") inList = true;
        else if (inList && name === "p:sldId") {
          const rid = attribs["r:id"];
          if (rid !== undefined) ids.push(rid);
        }
      },
      onclosetag(name) {
        if (name === "p:sldIdLst") inList = false;
      },
    },
    { xmlMode: true },
  );
  parser.write(xml);
  parser.end();
  return ids;
}

/**
 * Slide entry names in presentation order. Slide filenames don't track
 * order once slides are reordered — the truth is `presentation.xml`'s
 * `sldIdLst` resolved through its rels. Falls back to numeric filename
 * order when that metadata is missing or broken.
 */
function orderedSlideEntries(zip: ZipArchive): string[] {
  if (zip.has("ppt/presentation.xml") && zip.has("ppt/_rels/presentation.xml.rels")) {
    const targets = presentationRelTargets(
      zip.read("ppt/_rels/presentation.xml.rels").toString("utf8"),
    );
    const ordered = slideIdOrder(zip.read("ppt/presentation.xml").toString("utf8"))
      .map((rid) => targets.get(rid))
      .filter((entry): entry is string => entry !== undefined && zip.has(entry));
    if (ordered.length > 0) return ordered;
  }
  const numbered: { entry: string; n: number }[] = [];
  for (const name of zip.names) {
    const match = SLIDE_ENTRY.exec(name);
    const captured = match?.[1];
    if (captured !== undefined) numbered.push({ entry: name, n: Number(captured) });
  }
  return numbered.sort((a, b) => a.n - b.n).map(({ entry }) => entry);
}

/** The notes entry paired with a slide entry (shared filename number), or null. */
function notesEntryFor(slideEntry: string): string | null {
  const match = SLIDE_ENTRY.exec(slideEntry);
  const captured = match?.[1];
  return captured === undefined ? null : `ppt/notesSlides/notesSlide${captured}.xml`;
}

/**
 * Extract PPTX bytes into text: slides in deck order under
 * `=== slide N of M ===` markers, speaker notes appended per slide.
 * Extraction stops at `slideCap` slides; `slides` reports the true total.
 */
export function extractPptx(
  bytes: Uint8Array,
  options: { readonly slideCap?: number } = {},
): PptxExtraction {
  const slideCap = options.slideCap ?? PPTX_SLIDE_CAP;
  try {
    const zip = openZip(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    const entries = orderedSlideEntries(zip);
    if (entries.length === 0) {
      return {
        ok: false,
        reason:
          "the package has no ppt/slides/*.xml entries — this does not look like a PowerPoint deck",
      };
    }
    const total = entries.length;
    const extracted = entries.slice(0, slideCap);
    const parts: string[] = [];
    for (const [i, entry] of extracted.entries()) {
      parts.push(`=== slide ${i + 1} of ${total} ===`);
      const body = slideParagraphs(zip.read(entry).toString("utf8"));
      parts.push(body.length > 0 ? body.join("\n") : PPTX_EMPTY_SLIDE_NOTE);
      const notesEntry = notesEntryFor(entry);
      if (notesEntry !== null && zip.has(notesEntry)) {
        const notes = slideParagraphs(zip.read(notesEntry).toString("utf8"));
        if (notes.length > 0) {
          parts.push("[speaker notes]");
          parts.push(notes.join("\n"));
        }
      }
    }
    if (extracted.length < total) {
      parts.push(
        `[extraction stopped at the slide cap — ${extracted.length} of ${total} slides extracted]`,
      );
    }
    return { ok: true, text: parts.join("\n"), slides: total };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
