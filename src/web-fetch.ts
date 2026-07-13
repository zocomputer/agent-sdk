import { Parser } from "htmlparser2";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";
import {
  buildContentCollapseNote,
  buildMetadataHeader,
  extractMainContent,
  looksLikeRawHtmlOutput,
  visibleTextLength,
} from "./web-page";

// The fetch + render core for the `webfetch` tool. Conventions follow the
// converged Claude Code / opencode / eve standard: browser UA with per-format
// Accept q-values, markdown as the default rendering for HTML, a one-shot
// honest-UA retry when Cloudflare's bot check rejects the browser UA (TLS
// fingerprint mismatch), and a hard response-size cap. HTML reduces to its
// main content with a metadata header (./web-page.ts) before conversion. Kept
// framework-free (no eve imports) with `fetchImpl` injectable so tests never
// touch the network; the tool wrapper owns bounding/spill and the attachment
// contract.

/** Hard cap on the fetched body; larger responses error rather than truncate. */
export const WEB_FETCH_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
/** Default fetch timeout for HTML/text pages, in seconds. */
export const WEB_FETCH_DEFAULT_TIMEOUT_SECONDS = 30;
/** PDFs are routinely tens of MB behind slow servers; give them a longer default. */
export const WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS = 60;
/** Maximum allowed timeout across all resource types, in seconds. */
export const WEB_FETCH_MAX_TIMEOUT_SECONDS = 120;

/** Output format for HTML rendering: markdown (default), raw text, or untouched HTML. */
export type WebFetchFormat = "markdown" | "text" | "html";

/**
 * Browser UA for the initial fetch; gets past naive bot filters but not
 * TLS-fingerprint checks (Cloudflare), which trigger the honest-UA retry.
 */
export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
/** Honest user-agent for the Cloudflare-challenge retry. */
export const FALLBACK_USER_AGENT = "agent-sdk";

function acceptHeader(format: WebFetchFormat): string {
  switch (format) {
    case "markdown":
      return "text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1";
    case "text":
      return "text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1";
    case "html":
      return "text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1";
  }
}

/**
 * Build request headers for a webfetch: Accept q-values per format,
 * Accept-Language, and User-Agent.
 */
export function buildWebFetchHeaders(
  format: WebFetchFormat,
  userAgent: string = BROWSER_USER_AGENT,
): Record<string, string> {
  return {
    Accept: acceptHeader(format),
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": userAgent,
  };
}

/**
 * Convert HTML to markdown via TurndownService, parsing with linkedom instead
 * of handing turndown a string directly so polyfilled DOM hosts (happy-dom
 * test preloads) don't silently collapse the output to an empty string.
 */
export function convertHtmlToMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  turndown.remove(["script", "style", "meta", "link"]);
  // Parse with linkedom explicitly instead of handing turndown the string:
  // given a string, turndown sniffs a global DOMParser at import time and
  // prefers it, and DOM-polyfilled hosts (e.g. a happy-dom test preload)
  // produce a document it can't traverse — output silently collapses to "".
  // The wrapper element mirrors turndown's own string path (elements arranged
  // in one root instead of head/body).
  const { document } = parseHTML(`<x-turndown id="turndown-root">${html}</x-turndown>`);
  const root = document.getElementById("turndown-root");
  if (root === null) throw new Error("unreachable: the turndown-root wrapper always parses");
  // linkedom's nodes implement the DOM surface turndown needs but aren't
  // lib.dom types (we compile without the DOM lib) — the one sanctioned cast.
  return turndown.turndown(root as unknown as Parameters<TurndownService["turndown"]>[0]);
}

const SKIPPED_HTML_TAGS = ["script", "style", "noscript", "iframe", "object", "embed"];

/**
 * Extract visible text from HTML via htmlparser2, skipping script/style/iframe
 * and collapsing whitespace runs left by stripped markup.
 */
export function extractTextFromHtml(html: string): string {
  let text = "";
  const skipStack: string[] = [];
  const parser = new Parser({
    onopentag(name: string) {
      if (skipStack.length > 0 || SKIPPED_HTML_TAGS.includes(name)) {
        skipStack.push(name);
      }
    },
    ontext(input: string) {
      if (skipStack.length === 0) text += input;
    },
    onclosetag(name: string) {
      if (skipStack.length > 0 && skipStack[skipStack.length - 1] === name) {
        skipStack.pop();
      }
    },
  });
  parser.write(html);
  parser.end();
  // Collapse the whitespace runs left behind by stripped markup.
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Check if a Content-Type header value is HTML (text/html or
 * application/xhtml+xml).
 */
export function isHtmlContentType(contentType: string): boolean {
  const mime = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mime === "text/html" || mime === "application/xhtml+xml";
}

/**
 * Sniff content to detect HTML even when the Content-Type header is wrong or
 * missing. Checks for common HTML markers at the start of the content.
 */
export function looksLikeHtml(content: string): boolean {
  const trimmed = content.trimStart().slice(0, 512).toLowerCase();
  return (
    trimmed.startsWith("<!doctype html") ||
    trimmed.startsWith("<html") ||
    /^<(!--|head|body|div|p|h[1-6]|span|a|ul|ol|li|table|script|style)\b/.test(trimmed)
  );
}

/**
 * Rendered web page text: the converted/extracted content plus an optional
 * note when the render looks suspect (content collapse, raw HTML in markdown).
 */
export interface RenderedWebText {
  readonly text: string;
  /** Honest-failure signal (content collapse, leftover raw HTML); absent when the render looks healthy. */
  readonly note?: string;
}

/**
 * Render fetched text per the requested format; non-HTML (and format "html")
 * passes through untouched. For markdown/text, the page first reduces to its
 * main content with a metadata header (falling back to the whole document
 * when extraction can't find one), and a render that comes back suspiciously
 * empty or tag-heavy carries a note saying so.
 */
export function renderWebText(
  content: string,
  contentType: string,
  format: WebFetchFormat,
  url: string,
): RenderedWebText {
  // Route by sniffed content in addition to Content-Type, since servers lie.
  const isHtml = isHtmlContentType(contentType) || looksLikeHtml(content);
  if (!isHtml || format === "html") return { text: content };
  const page = extractMainContent(content, url);
  const bodyHtml = page === null ? content : page.contentHtml;
  const converted =
    format === "markdown" ? convertHtmlToMarkdown(bodyHtml) : extractTextFromHtml(bodyHtml);
  const header = page === null ? null : buildMetadataHeader(page);
  const text = header === null ? converted : `${header}\n\n${converted}`;
  const notes: string[] = [];
  const collapse = buildContentCollapseNote({
    url,
    renderedChars: converted.trim().length,
    htmlChars: content.length,
    documentTextChars: visibleTextLength(content),
  });
  if (collapse !== null) notes.push(collapse);
  if (format === "markdown" && looksLikeRawHtmlOutput(converted)) {
    notes.push(
      'The markdown conversion left substantial raw HTML in the output — treat it as partially converted, or re-fetch with format "html" for the true page.',
    );
  }
  return notes.length === 0 ? { text } : { text, note: notes.join(" ") };
}

/**
 * The slice of `fetch` this module needs. Narrower than `typeof fetch` (Bun
 * adds a `preconnect` property to the global) so test stubs stay plain
 * functions.
 */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * A fetched HTTP resource: its body, Content-Type header, and the final URL
 * after redirects.
 */
export interface FetchedWebResource {
  readonly body: Buffer;
  /** Raw `content-type` header value; empty string when absent. */
  readonly contentType: string;
  /** URL after redirects when the fetch implementation exposes it; else the request URL. */
  readonly finalUrl: string;
}

/** Throws with a clear message for anything that isn't a plain http(s) URL. */
export function assertHttpUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Not a valid URL: ${url}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL must start with http:// or https://");
  }
}

/**
 * GET a URL with the standard headers, the Cloudflare-challenge retry, and the
 * response-size cap. Throws on non-2xx, oversized, or timed-out responses.
 */
export async function fetchWebResource(opts: {
  url: string;
  format: WebFetchFormat;
  timeoutMs: number;
  /**
   * Deadline (from request start) to extend to when the response headers
   * reveal a PDF the request URL didn't — a redirect to `.pdf` or an
   * extensionless URL served as `application/pdf`. Omit when the caller set
   * an explicit timeout, which always wins.
   */
  pdfTimeoutMs?: number;
  fetchImpl?: FetchLike;
  /** Cancels the fetch when the owning tool call is stopped. */
  abortSignal?: AbortSignal;
}): Promise<FetchedWebResource> {
  const { url, format, timeoutMs, pdfTimeoutMs } = opts;
  const fetchImpl = opts.fetchImpl ?? fetch;
  assertHttpUrl(url);
  // One deadline shared by both attempts — the retry doesn't reset the clock.
  // An AbortController (not AbortSignal.timeout) so the deadline can extend
  // once the headers show the resource is a PDF.
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(opts.abortSignal?.reason);
  if (opts.abortSignal?.aborted) {
    abortFromCaller();
  } else {
    opts.abortSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }
  const startedAt = Date.now();
  let deadlineMs = timeoutMs;
  let timer = setTimeout(() => controller.abort(), deadlineMs);
  const timedOut = () => new Error(`Request timed out after ${deadlineMs / 1000}s: ${url}`);
  try {
    const headers = buildWebFetchHeaders(format);
    let response: Response;
    try {
      response = await fetchImpl(url, { headers, signal: controller.signal });
      if (
        response.status === 403 &&
        response.headers.get("cf-mitigated") === "challenge"
      ) {
        response = await fetchImpl(url, {
          headers: { ...headers, "User-Agent": FALLBACK_USER_AGENT },
          signal: controller.signal,
        });
      }
    } catch (error) {
      if (opts.abortSignal?.aborted) throw abortReason(opts.abortSignal);
      if (controller.signal.aborted) throw timedOut();
      throw error;
    }
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${url}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    // Some fetch stubs/implementations leave Response.url empty; fall back to
    // the request URL so callers can always compare for cross-host redirects.
    const finalUrl = response.url === "" ? url : response.url;
    // The request URL can hide that the resource is a PDF; once the headers
    // say so, the body download gets the PDF deadline instead of the page one.
    if (
      pdfTimeoutMs !== undefined &&
      pdfTimeoutMs > deadlineMs &&
      responseLooksLikePdf(contentType, finalUrl)
    ) {
      clearTimeout(timer);
      deadlineMs = pdfTimeoutMs;
      const remaining = Math.max(deadlineMs - (Date.now() - startedAt), 0);
      timer = setTimeout(() => controller.abort(), remaining);
    }
    const contentLength = response.headers.get("content-length");
    if (contentLength !== null && Number.parseInt(contentLength, 10) > WEB_FETCH_MAX_RESPONSE_BYTES) {
      throw new Error(
        `Response too large (content-length exceeds the ${WEB_FETCH_MAX_RESPONSE_BYTES}-byte limit): ${url}`,
      );
    }
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await response.arrayBuffer();
    } catch (error) {
      if (opts.abortSignal?.aborted) throw abortReason(opts.abortSignal);
      if (controller.signal.aborted) throw timedOut();
      throw error;
    }
    if (arrayBuffer.byteLength > WEB_FETCH_MAX_RESPONSE_BYTES) {
      throw new Error(
        `Response too large (exceeds the ${WEB_FETCH_MAX_RESPONSE_BYTES}-byte limit): ${url}`,
      );
    }
    return {
      body: Buffer.from(arrayBuffer),
      contentType,
      finalUrl,
    };
  } finally {
    clearTimeout(timer);
    opts.abortSignal?.removeEventListener("abort", abortFromCaller);
  }
}

function abortReason(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  return new DOMException("The tool call was cancelled", "AbortError");
}

function responseLooksLikePdf(contentType: string, finalUrl: string): boolean {
  const mime = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mime === "application/pdf" || urlLooksLikePdf(finalUrl);
}

/**
 * Clamp the model-supplied timeout (seconds) into the allowed range, in ms.
 * An explicit timeout always wins; without one, `.pdf` URLs default higher
 * than pages (models rarely think to raise the timeout for a slow PDF).
 */
export function resolveWebFetchTimeoutMs(
  timeoutSeconds: number | undefined,
  url?: string,
): number {
  const fallback = urlLooksLikePdf(url)
    ? WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS
    : WEB_FETCH_DEFAULT_TIMEOUT_SECONDS;
  const seconds = timeoutSeconds ?? fallback;
  return Math.min(Math.max(seconds, 1), WEB_FETCH_MAX_TIMEOUT_SECONDS) * 1000;
}

function urlLooksLikePdf(url: string | undefined): boolean {
  if (url === undefined) return false;
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}
