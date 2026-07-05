import Defuddle from "defuddle";
import { parseHTML } from "linkedom";

// Main-content extraction and honest-failure signals for fetched web pages.
// Defuddle (Obsidian Web Clipper's reader-mode engine) prunes nav/footer/
// cookie-banner boilerplate and reads title/author/date metadata in the same
// pass; linkedom supplies the server-side DOM it runs on. Pure and
// framework-free: `renderWebText` (../web-fetch.ts) orchestrates, this module
// owns the extraction, the metadata header, and the collapse/domain notes.

export interface ExtractedWebPage {
  /** Cleaned main-content HTML, ready for markdown/text conversion. */
  readonly contentHtml: string;
  readonly title: string | null;
  readonly author: string | null;
  readonly published: string | null;
  readonly site: string | null;
}

const asField = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/** Visible-ish text length: script/style/noscript bodies and tags stripped. */
export function visibleTextLength(html: string): number {
  return html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

/**
 * Extract the page's main content and metadata. Returns null — meaning
 * "convert the whole document instead" — when extraction throws, comes back
 * empty, or prunes so aggressively it lost most of a modest page (better to
 * show boilerplate than to silently drop real content).
 */
export function extractMainContent(html: string, url: string): ExtractedWebPage | null {
  let parsed: ReturnType<Defuddle["parse"]>;
  try {
    const { document } = parseHTML(html);
    // linkedom's document isn't lib.dom's Document (we compile without the DOM
    // lib); defuddle only needs the query/traversal surface linkedom provides,
    // so this is the one sanctioned cast at the seam.
    parsed = new Defuddle(document as unknown as ConstructorParameters<typeof Defuddle>[0], {
      url,
    }).parse();
  } catch {
    return null;
  }
  const contentHtml = typeof parsed.content === "string" ? parsed.content : "";
  const extractedLength = visibleTextLength(contentHtml);
  if (extractedLength === 0) return null;
  // Over-pruning guard: a small extraction from a page with several times more
  // visible text means the cleaner guessed wrong about what's boilerplate.
  if (extractedLength < 500 && extractedLength * 4 < visibleTextLength(html)) return null;
  return {
    contentHtml,
    title: asField(parsed.title),
    author: asField(parsed.author),
    published: asField(parsed.published),
    site: asField(parsed.site),
  };
}

/**
 * A markdown header for the extracted page: the title as `#`, then one
 * blockquote line with whichever of author/site/published exist. Null when
 * there's nothing to say.
 */
export function buildMetadataHeader(
  page: Pick<ExtractedWebPage, "title" | "author" | "published" | "site">,
): string | null {
  const byline = [
    page.author === null ? null : `By ${page.author}`,
    page.site,
    page.published === null ? null : `Published ${page.published}`,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
  const lines: string[] = [];
  if (page.title !== null) lines.push(`# ${page.title}`);
  if (byline !== "") lines.push(`> ${byline}`);
  return lines.length === 0 ? null : lines.join("\n\n");
}

// Domains whose pages are client-rendered or login-walled: a fetch sees the
// empty shell, so the collapse note names the reason and a way forward.
const JS_RENDERED_DOMAIN_HINTS: readonly {
  readonly suffixes: readonly string[];
  readonly hint: string;
}[] = [
  {
    suffixes: ["x.com", "twitter.com"],
    hint: "X (Twitter) renders posts with client-side JavaScript and blocks anonymous scraping, so a plain fetch can't see the post.",
  },
  {
    suffixes: ["reddit.com"],
    hint: "Reddit renders client-side — fetch the JSON view (append .json to the post URL) or the same path on old.reddit.com instead.",
  },
  {
    suffixes: ["linkedin.com"],
    hint: "LinkedIn requires login; anonymous fetches get a wall instead of the content.",
  },
  {
    suffixes: ["instagram.com", "threads.net", "tiktok.com", "facebook.com"],
    hint: "This site renders client-side and gates content behind login, so a plain fetch can't see it.",
  },
  {
    suffixes: ["youtube.com", "youtu.be"],
    hint: "YouTube pages are a client-rendered player; the video itself isn't fetchable as text.",
  },
];

/** The domain-specific reason a fetch of this URL comes back empty, if known. */
export function jsRenderedDomainHint(url: string): string | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const { suffixes, hint } of JS_RENDERED_DOMAIN_HINTS) {
    for (const suffix of suffixes) {
      if (hostname === suffix || hostname.endsWith(`.${suffix}`)) return hint;
    }
  }
  return null;
}

/** Rendered text this small from HTML this big means the content never made it. */
export const COLLAPSE_RENDERED_MAX_CHARS = 200;
export const COLLAPSE_HTML_MIN_CHARS = 2_000;

/**
 * When a substantial HTML page renders to almost nothing, say so — the model
 * would otherwise read the near-empty result as "the page has no content"
 * instead of "the fetch couldn't see the content".
 *
 * `documentTextChars` — the whole document's visible text, before
 * main-content extraction — is what separates the two ways a render comes
 * back short: a JS shell or login wall has almost no visible text anywhere
 * in the document, while a legitimately short article sits inside a template
 * whose nav/footer boilerplate still carries plenty. Only the former earns
 * the note.
 */
export function buildContentCollapseNote(opts: {
  url: string;
  renderedChars: number;
  htmlChars: number;
  documentTextChars: number;
}): string | null {
  if (opts.renderedChars >= COLLAPSE_RENDERED_MAX_CHARS) return null;
  if (opts.documentTextChars >= COLLAPSE_RENDERED_MAX_CHARS) return null;
  if (opts.htmlChars < COLLAPSE_HTML_MIN_CHARS) return null;
  const base = `The page produced almost no readable text (${opts.renderedChars} chars from ${opts.htmlChars} chars of HTML) — its content likely renders with client-side JavaScript or sits behind a login or bot wall.`;
  const hint = jsRenderedDomainHint(opts.url);
  return hint === null ? base : `${base} ${hint}`;
}

/**
 * Detect a markdown conversion that left the output substantially raw HTML
 * (e.g. markup turndown couldn't traverse), so the result can say so instead
 * of passing tag soup off as a clean read.
 */
export function looksLikeRawHtmlOutput(rendered: string): boolean {
  if (rendered.length === 0) return false;
  // `[^<>]` (not `[^>]`) bounds the attribute scan to a single tag: an
  // unterminated `<tag …` fails at the next `<` instead of scanning to the
  // end of the string, which kept this linear on hostile input (a fetched
  // page of `"<a ".repeat(n)` was polynomial — CodeQL js/polynomial-redos).
  const tags = rendered.match(/<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?>/gi);
  if (tags === null || tags.length < 10) return false;
  const tagChars = tags.reduce((sum, tag) => sum + tag.length, 0);
  return tagChars / rendered.length > 0.1;
}
