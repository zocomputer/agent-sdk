import { describe, expect, test } from "bun:test";
import {
  buildContentCollapseNote,
  buildMetadataHeader,
  COLLAPSE_HTML_MIN_CHARS,
  COLLAPSE_RENDERED_MAX_CHARS,
  extractMainContent,
  jsRenderedDomainHint,
  looksLikeRawHtmlOutput,
} from "./web-page";

// A realistic news article: metadata in head, real content inside
// <main>/<article>, and the boilerplate every page carries (nav, cookie
// banner, related-stories aside, footer link farm).
const ARTICLE = `<!DOCTYPE html>
<html><head>
<title>Widget Trends 2026 — Example News</title>
<meta property="og:title" content="Widget Trends 2026">
<meta property="og:site_name" content="Example News">
<meta property="og:description" content="Widget industry growth analysis for 2026.">
<meta property="article:published_time" content="2026-06-01T10:00:00Z">
<meta name="author" content="Jane Doe">
</head><body>
<nav><ul><li><a href="/">Home</a></li><li><a href="/tech">Tech</a></li><li><a href="/sports">Sports</a></li><li><a href="/about">About us</a></li></ul></nav>
<div class="cookie-banner">We use cookies. <button>Accept</button> <button>Reject</button></div>
<main>
<article>
<h1>Widget Trends 2026</h1>
<p class="byline">By Jane Doe</p>
<p>The widget industry saw unprecedented growth this year, with over 40% of manufacturers reporting record output. Analysts attribute the shift to three converging factors described below.</p>
<p>First, raw material costs fell sharply after the trade normalization of late 2025. Second, automation in mid-size factories reached the tipping point economists had predicted for a decade. Third, consumer appetite for bespoke widgets grew in every surveyed market.</p>
<h2>What comes next</h2>
<p>Industry watchers expect consolidation. "The small shops either specialize or get bought," said Maria Chen of the Widget Institute. The institute's annual report projects flat growth for 2027 before another surge.</p>
</article>
</main>
<aside><h3>Related stories</h3><ul><li><a href="/a">Widget prices fall</a></li><li><a href="/b">Interview with a widget maker</a></li></ul></aside>
<footer><p>© 2026 Example News. <a href="/privacy">Privacy</a> <a href="/terms">Terms</a> <a href="/contact">Contact</a></p></footer>
</body></html>`;

describe("extractMainContent", () => {
  test("keeps the article body and reads the page metadata", () => {
    const page = extractMainContent(ARTICLE, "https://news.example.com/widgets");
    if (page === null) throw new Error("expected an extraction");
    expect(page.title).toBe("Widget Trends 2026");
    expect(page.author).toBe("Jane Doe");
    expect(page.site).toBe("Example News");
    expect(page.published).toBe("2026-06-01T10:00:00Z");
    expect(page.contentHtml).toContain("unprecedented growth");
    expect(page.contentHtml).toContain("What comes next");
  });

  test("strips nav, cookie banner, related-stories aside, and footer", () => {
    const page = extractMainContent(ARTICLE, "https://news.example.com/widgets");
    if (page === null) throw new Error("expected an extraction");
    expect(page.contentHtml).not.toContain("We use cookies");
    expect(page.contentHtml).not.toContain("Related stories");
    expect(page.contentHtml).not.toContain("Privacy");
    expect(page.contentHtml).not.toContain("About us");
  });

  test("returns null for a page with no readable content", () => {
    const shell =
      '<!DOCTYPE html><html><head><title>App</title></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>';
    expect(extractMainContent(shell, "https://app.example.com")).toBeNull();
    expect(extractMainContent("", "https://app.example.com")).toBeNull();
    expect(extractMainContent("not html at all", "https://app.example.com")).toBeNull();
  });

  test("rejects an over-pruned extraction so the caller falls back to the whole page", () => {
    // A tiny article next to a mountain of visible footer text: keeping only
    // the article would silently drop most of what the page shows.
    const link = (i: number) =>
      `<li><a href="/${i}">Category listing number ${i} with a long descriptive label</a></li>`;
    const hub = `<!DOCTYPE html><html><head><title>Hub</title></head><body>
<article><p>Short teaser.</p></article>
<footer><ul>${Array.from({ length: 60 }, (_, i) => link(i)).join("")}</ul></footer>
</body></html>`;
    expect(extractMainContent(hub, "https://hub.example.com/")).toBeNull();
  });
});

describe("buildMetadataHeader", () => {
  test("renders the title heading and one byline row", () => {
    const header = buildMetadataHeader({
      title: "Widget Trends 2026",
      author: "Jane Doe",
      site: "Example News",
      published: "2026-06-01",
    });
    expect(header).toBe(
      "# Widget Trends 2026\n\n> By Jane Doe · Example News · Published 2026-06-01",
    );
  });

  test("skips absent fields", () => {
    expect(
      buildMetadataHeader({ title: "Solo", author: null, site: null, published: null }),
    ).toBe("# Solo");
    expect(
      buildMetadataHeader({ title: null, author: "Jane", site: null, published: null }),
    ).toBe("> By Jane");
  });

  test("returns null when there is nothing to say", () => {
    expect(
      buildMetadataHeader({ title: null, author: null, site: null, published: null }),
    ).toBeNull();
  });
});

describe("jsRenderedDomainHint", () => {
  test("matches known client-rendered domains, including subdomains", () => {
    expect(jsRenderedDomainHint("https://x.com/someone/status/1")).toContain("X (Twitter)");
    expect(jsRenderedDomainHint("https://mobile.twitter.com/someone")).toContain("X (Twitter)");
    expect(jsRenderedDomainHint("https://www.reddit.com/r/x/comments/1/y/")).toContain(
      "old.reddit.com",
    );
    expect(jsRenderedDomainHint("https://www.youtube.com/watch?v=abc")).toContain("player");
  });

  test("ignores unknown domains, lookalike suffixes, and junk", () => {
    expect(jsRenderedDomainHint("https://example.com/")).toBeNull();
    expect(jsRenderedDomainHint("https://notx.com/")).toBeNull();
    expect(jsRenderedDomainHint("https://x.com.evil.example/")).toBeNull();
    expect(jsRenderedDomainHint("not a url")).toBeNull();
  });
});

describe("buildContentCollapseNote", () => {
  test("fires when a substantial page renders to almost nothing", () => {
    const note = buildContentCollapseNote({
      url: "https://app.example.com/",
      renderedChars: 3,
      htmlChars: 50_000,
      documentTextChars: 3,
    });
    expect(note).toContain("almost no readable text");
    expect(note).toContain("3 chars from 50000 chars");
  });

  test("appends the domain hint when the URL is a known client-rendered site", () => {
    const note = buildContentCollapseNote({
      url: "https://x.com/someone/status/1",
      renderedChars: 0,
      htmlChars: 10_000,
      documentTextChars: 0,
    });
    expect(note).toContain("X (Twitter)");
  });

  test("stays silent for healthy renders and for genuinely small pages", () => {
    expect(
      buildContentCollapseNote({
        url: "https://a.example",
        renderedChars: COLLAPSE_RENDERED_MAX_CHARS,
        htmlChars: 50_000,
        documentTextChars: COLLAPSE_RENDERED_MAX_CHARS,
      }),
    ).toBeNull();
    expect(
      buildContentCollapseNote({
        url: "https://a.example",
        renderedChars: 3,
        htmlChars: COLLAPSE_HTML_MIN_CHARS - 1,
        documentTextChars: 3,
      }),
    ).toBeNull();
  });

  test("stays silent for a short article inside a text-heavy template", () => {
    // Extraction pared a big page down to a two-line post; the document's
    // nav/footer boilerplate still carries plenty of visible text, so the
    // short render is faithful, not a JS shell.
    expect(
      buildContentCollapseNote({
        url: "https://blog.example.com/til",
        renderedChars: 80,
        htmlChars: 60_000,
        documentTextChars: 1_500,
      }),
    ).toBeNull();
  });
});

describe("looksLikeRawHtmlOutput", () => {
  test("flags output that is substantially markup", () => {
    const soup = '<div class="a"><span data-x="1">x</span></div>'.repeat(20);
    expect(looksLikeRawHtmlOutput(soup)).toBe(true);
  });

  test("passes clean markdown, sparse tags, and empty output", () => {
    expect(looksLikeRawHtmlOutput("# Title\n\nSome *markdown* with [a link](https://x).")).toBe(
      false,
    );
    // A long clean document mentioning a few literal tags (e.g. code samples).
    const mostlyProse = `${"Real prose. ".repeat(500)}<div> <span> <div> <span> <div> <span> <div> <span> <div> <span>`;
    expect(looksLikeRawHtmlOutput(mostlyProse)).toBe(false);
    expect(looksLikeRawHtmlOutput("")).toBe(false);
  });
});
