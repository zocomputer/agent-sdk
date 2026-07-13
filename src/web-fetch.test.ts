import { describe, expect, test } from "bun:test";
import {
  assertHttpUrl,
  BROWSER_USER_AGENT,
  buildWebFetchHeaders,
  convertHtmlToMarkdown,
  extractTextFromHtml,
  FALLBACK_USER_AGENT,
  fetchWebResource,
  isHtmlContentType,
  looksLikeHtml,
  type FetchLike,
  renderWebText,
  resolveWebFetchTimeoutMs,
  WEB_FETCH_MAX_RESPONSE_BYTES,
} from "./web-fetch";

const PAGE = `<!doctype html><html><head>
<script>alert("nope")</script><style>body{color:red}</style>
<title>Docs</title></head>
<body><h1>Heading</h1><p>Some <em>emphasized</em> text and a <a href="https://example.com/next">link</a>.</p>
<noscript>enable js</noscript></body></html>`;

describe("convertHtmlToMarkdown", () => {
  test("produces atx markdown and drops script/style", () => {
    const md = convertHtmlToMarkdown(PAGE);
    expect(md).toContain("# Heading");
    expect(md).toContain("*emphasized*");
    expect(md).toContain("[link](https://example.com/next)");
    expect(md).not.toContain("alert");
    expect(md).not.toContain("color:red");
  });
});

describe("extractTextFromHtml", () => {
  test("keeps visible text, drops scripted/styled/noscript content", () => {
    const text = extractTextFromHtml(PAGE);
    expect(text).toContain("Heading");
    expect(text).toContain("Some emphasized text and a link.");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("enable js");
  });

  test("skips nested content inside skipped tags", () => {
    const text = extractTextFromHtml(
      "<div>keep<iframe><p>lost</p><span>also lost</span></iframe>me</div>",
    );
    expect(text).toBe("keepme");
  });

  test("decodes entities and collapses whitespace runs", () => {
    const text = extractTextFromHtml("<p>a &amp;   b</p>\n\n\n\n<p>c</p>");
    expect(text).toBe("a & b\n\nc");
  });
});

describe("buildWebFetchHeaders", () => {
  test("prefers the requested format in Accept and sends a browser UA", () => {
    const markdown = buildWebFetchHeaders("markdown");
    expect(markdown.Accept?.startsWith("text/markdown;q=1.0")).toBe(true);
    expect(markdown["User-Agent"]).toBe(BROWSER_USER_AGENT);
    expect(buildWebFetchHeaders("text").Accept?.startsWith("text/plain;q=1.0")).toBe(true);
    expect(buildWebFetchHeaders("html").Accept?.startsWith("text/html;q=1.0")).toBe(true);
  });
});

describe("isHtmlContentType / renderWebText", () => {
  test("matches html mime with charset params", () => {
    expect(isHtmlContentType("text/html; charset=utf-8")).toBe(true);
    expect(isHtmlContentType("application/xhtml+xml")).toBe(true);
    expect(isHtmlContentType("application/json")).toBe(false);
    expect(isHtmlContentType("")).toBe(false);
  });

  const U = "https://example.com/page";

  test("renders html per format and passes non-html through", () => {
    expect(renderWebText("<h1>Hi</h1>", "text/html", "markdown", U)).toEqual({ text: "# Hi" });
    expect(renderWebText("<h1>Hi</h1>", "text/html", "text", U)).toEqual({ text: "Hi" });
    expect(renderWebText("<h1>Hi</h1>", "text/html", "html", U)).toEqual({
      text: "<h1>Hi</h1>",
    });
    expect(renderWebText('{"a":1}', "application/json", "markdown", U)).toEqual({
      text: '{"a":1}',
    });
  });

  test("reduces a full page to its main content under a metadata header", () => {
    const page = `<!DOCTYPE html><html><head>
<title>Widget Trends 2026 — Example News</title>
<meta property="og:title" content="Widget Trends 2026">
<meta property="og:site_name" content="Example News">
<meta name="author" content="Jane Doe">
</head><body>
<nav><a href="/">Home</a><a href="/about">About us</a></nav>
<div class="cookie-banner">We use cookies. <button>Accept</button></div>
<main><article>
<h1>Widget Trends 2026</h1>
<p>The widget industry saw unprecedented growth this year, with over 40% of manufacturers reporting record output. Analysts attribute the shift to converging factors.</p>
<p>Raw material costs fell sharply after the trade normalization of late 2025, and consumer appetite for bespoke widgets grew in every surveyed market.</p>
</article></main>
<footer><a href="/privacy">Privacy</a> <a href="/terms">Terms</a></footer>
</body></html>`;
    const rendered = renderWebText(page, "text/html", "markdown", U);
    expect(rendered.text).toContain("# Widget Trends 2026");
    expect(rendered.text).toContain("> By Jane Doe · Example News");
    expect(rendered.text).toContain("unprecedented growth");
    expect(rendered.text).not.toContain("We use cookies");
    expect(rendered.text).not.toContain("Privacy");
    expect(rendered.note).toBeUndefined();
  });

  test("a substantial page that renders to nothing carries a collapse note", () => {
    const shell = `<!DOCTYPE html><html><head><title>App</title></head><body><div id="root"></div><script>${"var pad=1;".repeat(400)}</script></body></html>`;
    const rendered = renderWebText(shell, "text/html", "markdown", "https://x.com/user/status/1");
    expect(rendered.note).toContain("almost no readable text");
    expect(rendered.note).toContain("X (Twitter)");
    // format "html" passes through raw, so no collapse note applies.
    expect(renderWebText(shell, "text/html", "html", U).note).toBeUndefined();
  });
});

describe("assertHttpUrl", () => {
  test("accepts http and https, rejects everything else", () => {
    expect(() => assertHttpUrl("https://example.com")).not.toThrow();
    expect(() => assertHttpUrl("http://example.com")).not.toThrow();
    expect(() => assertHttpUrl("ftp://example.com")).toThrow(/http/);
    expect(() => assertHttpUrl("file:///etc/passwd")).toThrow(/http/);
    expect(() => assertHttpUrl("not a url")).toThrow(/valid URL/);
  });
});

describe("resolveWebFetchTimeoutMs", () => {
  test("defaults to 30s and clamps to [1s, 120s]", () => {
    expect(resolveWebFetchTimeoutMs(undefined)).toBe(30_000);
    expect(resolveWebFetchTimeoutMs(5)).toBe(5_000);
    expect(resolveWebFetchTimeoutMs(600)).toBe(120_000);
    expect(resolveWebFetchTimeoutMs(0)).toBe(1_000);
  });

  test(".pdf URLs default to 60s; an explicit timeout still wins", () => {
    expect(resolveWebFetchTimeoutMs(undefined, "https://example.com/paper.pdf")).toBe(60_000);
    expect(resolveWebFetchTimeoutMs(undefined, "https://example.com/paper.PDF?dl=1")).toBe(
      60_000,
    );
    expect(resolveWebFetchTimeoutMs(5, "https://example.com/paper.pdf")).toBe(5_000);
    expect(resolveWebFetchTimeoutMs(undefined, "https://example.com/page")).toBe(30_000);
    expect(resolveWebFetchTimeoutMs(undefined, "not a url")).toBe(30_000);
  });
});

// A fetch stub that records requests and pops responses in order.
function stubFetch(responses: Response[]) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const impl: FetchLike = (input, init) => {
    calls.push({
      url: input,
      headers: { ...((init?.headers ?? {}) as Record<string, string>) },
    });
    const next = responses.shift();
    if (!next) throw new Error("stub exhausted");
    return Promise.resolve(next);
  };
  return { impl, calls };
}

describe("fetchWebResource", () => {
  test("cancels the request with the owning tool call", async () => {
    const controller = new AbortController();
    const fetchImpl: FetchLike = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true },
        );
      });
    const pending = fetchWebResource({
      url: "https://example.com/slow",
      format: "markdown",
      timeoutMs: 5_000,
      fetchImpl,
      abortSignal: controller.signal,
    });
    controller.abort(new Error("turn cancelled"));
    await expect(pending).rejects.toThrow("turn cancelled");
  });

  test("returns body, content type, and the request url as finalUrl fallback", async () => {
    const { impl, calls } = stubFetch([
      new Response("hello", { status: 200, headers: { "content-type": "text/plain" } }),
    ]);
    const result = await fetchWebResource({
      url: "https://example.com/a",
      format: "markdown",
      timeoutMs: 5_000,
      fetchImpl: impl,
    });
    expect(result.body.toString()).toBe("hello");
    expect(result.contentType).toBe("text/plain");
    expect(result.finalUrl).toBe("https://example.com/a");
    expect(calls[0]?.headers["User-Agent"]).toBe(BROWSER_USER_AGENT);
  });

  test("exposes the redirected final URL when the response carries one", async () => {
    const redirected = new Response("moved", { status: 200 });
    Object.defineProperty(redirected, "url", { value: "https://other.example.com/b" });
    const { impl } = stubFetch([redirected]);
    const result = await fetchWebResource({
      url: "https://example.com/a",
      format: "markdown",
      timeoutMs: 5_000,
      fetchImpl: impl,
    });
    expect(result.finalUrl).toBe("https://other.example.com/b");
  });

  test("retries a Cloudflare challenge once with the honest UA", async () => {
    const { impl, calls } = stubFetch([
      new Response("blocked", { status: 403, headers: { "cf-mitigated": "challenge" } }),
      new Response("welcome", { status: 200 }),
    ]);
    const result = await fetchWebResource({
      url: "https://example.com",
      format: "markdown",
      timeoutMs: 5_000,
      fetchImpl: impl,
    });
    expect(result.body.toString()).toBe("welcome");
    expect(calls).toHaveLength(2);
    expect(calls[1]?.headers["User-Agent"]).toBe(FALLBACK_USER_AGENT);
  });

  test("a plain 403 (no challenge header) fails without retrying", async () => {
    const { impl, calls } = stubFetch([new Response("forbidden", { status: 403 })]);
    await expect(
      fetchWebResource({
        url: "https://example.com",
        format: "markdown",
        timeoutMs: 5_000,
        fetchImpl: impl,
      }),
    ).rejects.toThrow(/status 403/);
    expect(calls).toHaveLength(1);
  });

  test("rejects oversized responses via content-length and via body size", async () => {
    const big = String(WEB_FETCH_MAX_RESPONSE_BYTES + 1);
    const { impl } = stubFetch([
      new Response("x", { status: 200, headers: { "content-length": big } }),
    ]);
    await expect(
      fetchWebResource({
        url: "https://example.com",
        format: "markdown",
        timeoutMs: 5_000,
        fetchImpl: impl,
      }),
    ).rejects.toThrow(/too large/);

    // A body that overflows without an honest content-length header.
    const oversized = new Response(Buffer.alloc(WEB_FETCH_MAX_RESPONSE_BYTES + 1), {
      status: 200,
    });
    oversized.headers.delete("content-length");
    const second = stubFetch([oversized]);
    await expect(
      fetchWebResource({
        url: "https://example.com",
        format: "markdown",
        timeoutMs: 5_000,
        fetchImpl: second.impl,
      }),
    ).rejects.toThrow(/too large/);
  });

  test("maps an abort into a timeout error", async () => {
    const hang: FetchLike = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    await expect(
      fetchWebResource({
        url: "https://example.com",
        format: "markdown",
        timeoutMs: 20,
        fetchImpl: hang,
      }),
    ).rejects.toThrow(/timed out/);
  });

  // A response whose body takes `delayMs` to download and honors the fetch
  // abort signal, mimicking real fetch's streaming arrayBuffer.
  function slowBodyFetch(opts: { finalUrl?: string; contentType?: string; delayMs: number }) {
    const impl: FetchLike = (_input, init) => {
      const signal = init?.signal;
      const response = new Response("x", {
        status: 200,
        headers: opts.contentType === undefined ? {} : { "content-type": opts.contentType },
      });
      if (opts.finalUrl !== undefined) {
        Object.defineProperty(response, "url", { value: opts.finalUrl });
      }
      Object.defineProperty(response, "arrayBuffer", {
        value: () =>
          new Promise<ArrayBuffer>((resolve, reject) => {
            const timer = setTimeout(
              () => resolve(new TextEncoder().encode("pdf-bytes").buffer as ArrayBuffer),
              opts.delayMs,
            );
            signal?.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(new DOMException("aborted", "AbortError"));
            });
          }),
      });
      return Promise.resolve(response);
    };
    return impl;
  }

  test("a redirect to a .pdf extends the deadline for the body download", async () => {
    const result = await fetchWebResource({
      url: "https://example.com/paper",
      format: "markdown",
      timeoutMs: 50,
      pdfTimeoutMs: 5_000,
      fetchImpl: slowBodyFetch({ finalUrl: "https://cdn.example.com/paper.pdf", delayMs: 200 }),
    });
    expect(result.body.toString()).toBe("pdf-bytes");
    expect(result.finalUrl).toBe("https://cdn.example.com/paper.pdf");
  });

  test("an extensionless URL served as application/pdf extends the deadline too", async () => {
    const result = await fetchWebResource({
      url: "https://example.com/download?id=1",
      format: "markdown",
      timeoutMs: 50,
      pdfTimeoutMs: 5_000,
      fetchImpl: slowBodyFetch({ contentType: "application/pdf", delayMs: 200 }),
    });
    expect(result.body.toString()).toBe("pdf-bytes");
    expect(result.contentType).toBe("application/pdf");
  });

  test("without pdfTimeoutMs a slow PDF body still hits the base deadline", async () => {
    await expect(
      fetchWebResource({
        url: "https://example.com/download?id=1",
        format: "markdown",
        timeoutMs: 50,
        fetchImpl: slowBodyFetch({ contentType: "application/pdf", delayMs: 200 }),
      }),
    ).rejects.toThrow(/timed out after 0.05s/);
  });

  test("a non-PDF response never gets the PDF extension", async () => {
    await expect(
      fetchWebResource({
        url: "https://example.com/page",
        format: "markdown",
        timeoutMs: 50,
        pdfTimeoutMs: 5_000,
        fetchImpl: slowBodyFetch({ contentType: "text/html", delayMs: 200 }),
      }),
    ).rejects.toThrow(/timed out after 0.05s/);
  });

  test("rejects non-http urls before fetching", async () => {
    const { impl, calls } = stubFetch([]);
    await expect(
      fetchWebResource({
        url: "ftp://example.com",
        format: "markdown",
        timeoutMs: 5_000,
        fetchImpl: impl,
      }),
    ).rejects.toThrow(/http/);
    expect(calls).toHaveLength(0);
  });

  test("detects HTML content even with wrong Content-Type", () => {
    const html = "<html><body><h1>Title</h1></body></html>";
    // Content-Type says text/plain, but content is clearly HTML
    const result = renderWebText(html, "text/plain", "markdown", "https://example.com/x");
    expect(result.text).toContain("# Title");
    expect(result.text).not.toContain("<html>");
  });

  test("detects HTML by DOCTYPE and common tags", () => {
    expect(looksLikeHtml("<!DOCTYPE html><html></html>")).toBe(true);
    expect(looksLikeHtml("<html><body></body></html>")).toBe(true);
    expect(looksLikeHtml("  \n<!doctype html>")).toBe(true);
    expect(looksLikeHtml("<div>content</div>")).toBe(true);
    expect(looksLikeHtml("<h1>Heading</h1>")).toBe(true);
    expect(looksLikeHtml("plain text content")).toBe(false);
    expect(looksLikeHtml("{}")).toBe(false);
  });

  test("does not treat XML feeds as HTML", () => {
    // RSS/Atom feeds start with <?xml but are not HTML
    expect(looksLikeHtml('<?xml version="1.0"?><rss><channel></channel></rss>')).toBe(false);
    expect(looksLikeHtml('<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>')).toBe(false);
    // SVG is also XML, not HTML
    expect(looksLikeHtml('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBe(false);
    // Plain XML without <?xml header
    expect(looksLikeHtml('<rss><channel><title>Feed</title></channel></rss>')).toBe(false);
  });

  test("extractTextFromHtml handles malformed nested tags correctly", () => {
    // Malformed HTML: <div> inside <script> shouldn't end the skip
    const malformed = "<script><div></div>alert('bad')</script><p>good</p>";
    const text = extractTextFromHtml(malformed);
    expect(text).not.toContain("alert");
    expect(text).not.toContain("bad");
    expect(text).toContain("good");
  });

});
