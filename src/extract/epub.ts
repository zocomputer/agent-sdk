import { Parser } from "htmlparser2";
import { openZip, type ZipArchive } from "./zip";

// EPUB → text: resolve the OPF package via META-INF/container.xml, walk the
// spine in reading order, and strip each XHTML section to text under
// `=== section N of M (href) ===` markers. Falls back to the archive's
// (X)HTML entries in name order when the package metadata is broken — a
// degraded book still reads.

/**
 * Result of EPUB extraction: text with explicit section markers plus the
 * section count, or a failure reason.
 */
export type EpubExtraction =
  | { readonly ok: true; readonly text: string; readonly sections: number }
  | { readonly ok: false; readonly reason: string };

/**
 * Extraction section cap, mirroring the PDF page cap: the view budget
 * paginates the text; this bounds the extraction work itself.
 */
export const EPUB_SECTION_CAP = 200;

// Tags that terminate a line when stripping XHTML to text.
const BLOCK_TAGS = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "tr",
  "br",
  "section",
  "article",
  "blockquote",
  "pre",
  "figcaption",
]);

/** Strip one (X)HTML document to plain text: block tags break lines, script/style/head content is dropped. */
export function xhtmlToText(html: string): string {
  let text = "";
  let skipDepth = 0;
  const parser = new Parser({
    onopentag(name) {
      if (name === "script" || name === "style" || name === "head") skipDepth++;
      else if (BLOCK_TAGS.has(name)) text += "\n";
    },
    ontext(chunk) {
      if (skipDepth === 0) text += chunk;
    },
    onclosetag(name) {
      if (name === "script" || name === "style" || name === "head") skipDepth--;
      else if (BLOCK_TAGS.has(name)) text += "\n";
    },
  });
  parser.write(html);
  parser.end();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function attributeOf(xml: string, tag: string, attribute: string): string | null {
  // One targeted regex beats a full DOM for a single well-formed attribute
  // read; the fallback path covers files this misses.
  const pattern = new RegExp(`<${tag}[^>]*\\s${attribute}="([^"]*)"`, "i");
  return pattern.exec(xml)?.[1] ?? null;
}

function dirnamePosix(path: string): string {
  const at = path.lastIndexOf("/");
  return at === -1 ? "" : path.slice(0, at);
}

function resolveHref(opfDir: string, href: string): string {
  if (opfDir === "") return href;
  const parts = `${opfDir}/${href}`.split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return resolved.join("/");
}

/** The spine's section entry names, in reading order (empty on broken metadata). */
function spineEntries(zip: ZipArchive): string[] {
  if (!zip.has("META-INF/container.xml")) return [];
  const container = zip.read("META-INF/container.xml").toString("utf8");
  const opfPath = attributeOf(container, "rootfile", "full-path");
  if (opfPath === null || !zip.has(opfPath)) return [];
  const opf = zip.read(opfPath).toString("utf8");
  const opfDir = dirnamePosix(opfPath);

  const hrefById = new Map<string, string>();
  const itemPattern = /<item\s[^>]*>/gi;
  for (const [tag] of opf.matchAll(itemPattern)) {
    const id = /\sid="([^"]*)"/i.exec(tag)?.[1];
    const href = /\shref="([^"]*)"/i.exec(tag)?.[1];
    if (id !== undefined && href !== undefined) hrefById.set(id, href);
  }

  const entries: string[] = [];
  const itemrefPattern = /<itemref\s[^>]*idref="([^"]*)"/gi;
  for (const match of opf.matchAll(itemrefPattern)) {
    const idref = match[1];
    if (idref === undefined) continue;
    const href = hrefById.get(idref);
    if (href === undefined) continue;
    const entry = resolveHref(opfDir, decodeURIComponent(href));
    if (zip.has(entry)) entries.push(entry);
  }
  return entries;
}

/**
 * Extract EPUB bytes into text: spine sections in reading order under
 * `=== section N of M (href) ===` markers. Extraction stops at
 * `sectionCap` sections; `sections` reports the true total.
 */
export function extractEpub(
  bytes: Uint8Array,
  options: { readonly sectionCap?: number } = {},
): EpubExtraction {
  const sectionCap = options.sectionCap ?? EPUB_SECTION_CAP;
  try {
    const zip = openZip(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    let entries = spineEntries(zip);
    if (entries.length === 0) {
      // Broken/absent package metadata: fall back to the archive's document
      // entries in name order — imperfect ordering beats refusing the book.
      entries = zip.names.filter((name) => /\.x?html$/i.test(name)).sort();
    }
    if (entries.length === 0) {
      return {
        ok: false,
        reason:
          "the archive has no readable sections (no OPF spine, no .xhtml/.html entries) — this does not look like an EPUB book",
      };
    }
    const total = entries.length;
    const extracted = entries.slice(0, sectionCap);
    const parts: string[] = [];
    for (const [i, entry] of extracted.entries()) {
      parts.push(`=== section ${i + 1} of ${total} (${entry}) ===`);
      const text = xhtmlToText(zip.read(entry).toString("utf8"));
      parts.push(text.length > 0 ? text : "[no text in this section]");
    }
    if (extracted.length < total) {
      parts.push(
        `[extraction stopped at the section cap — ${extracted.length} of ${total} sections extracted]`,
      );
    }
    return { ok: true, text: parts.join("\n"), sections: total };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
