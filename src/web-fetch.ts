// The ambient typing for domino (which ships no usable .d.ts) must travel with
// this module: raw-TS consumers (rib via `file:`) compile these sources through
// their own tsconfig, which doesn't `include` our sibling .d.ts files.
/// <reference path="./domino.d.ts" />
import domino from "@mixmark-io/domino";
import { Parser } from "htmlparser2";
import TurndownService from "turndown";

// The fetch + render core for the `webfetch` tool. Conventions follow the
// converged Claude Code / opencode / eve standard: browser UA with per-format
// Accept q-values, markdown as the default rendering for HTML, a one-shot
// honest-UA retry when Cloudflare's bot check rejects the browser UA (TLS
// fingerprint mismatch), and a hard response-size cap. Kept framework-free
// (no eve imports) with `fetchImpl` injectable so tests never touch the
// network; the tool wrapper owns bounding/spill and the attachment contract.

/** Hard cap on the fetched body; larger responses error rather than truncate. */
export const WEB_FETCH_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
export const WEB_FETCH_DEFAULT_TIMEOUT_SECONDS = 30;
export const WEB_FETCH_MAX_TIMEOUT_SECONDS = 120;

export type WebFetchFormat = "markdown" | "text" | "html";

// A real browser UA gets past naive bot filters; sites that inspect the TLS
// fingerprint (Cloudflare) see through it, hence the honest-UA retry below.
export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
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

export function convertHtmlToMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  turndown.remove(["script", "style", "meta", "link"]);
  // Parse with domino (turndown's own server-side parser) explicitly instead
  // of handing turndown the string: given a string, turndown sniffs a global
  // DOMParser at import time and prefers it, and DOM-polyfilled hosts (e.g. a
  // happy-dom test preload) produce a document it can't traverse — output
  // silently collapses to "". The wrapper element mirrors turndown's own
  // string path (elements arranged in one root instead of head/body).
  const doc = domino.createDocument(
    `<x-turndown id="turndown-root">${html}</x-turndown>`,
  );
  const root = doc.getElementById("turndown-root");
  if (root === null) throw new Error("unreachable: the turndown-root wrapper always parses");
  // Domino's nodes implement the DOM surface turndown needs; the lib ships no
  // types (see domino.d.ts), so this is the one sanctioned cast at the seam.
  return turndown.turndown(root as unknown as Parameters<TurndownService["turndown"]>[0]);
}

const SKIPPED_HTML_TAGS = ["script", "style", "noscript", "iframe", "object", "embed"];

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

/** Render fetched text per the requested format; non-HTML passes through untouched. */
export function renderWebText(
  content: string,
  contentType: string,
  format: WebFetchFormat,
): string {
  // Route by sniffed content in addition to Content-Type, since servers lie.
  const isHtml = isHtmlContentType(contentType) || looksLikeHtml(content);
  if (!isHtml) return content;
  if (format === "markdown") return convertHtmlToMarkdown(content);
  if (format === "text") return extractTextFromHtml(content);
  return content;
}

/**
 * The slice of `fetch` this module needs. Narrower than `typeof fetch` (Bun
 * adds a `preconnect` property to the global) so test stubs stay plain
 * functions.
 */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

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
  fetchImpl?: FetchLike;
}): Promise<FetchedWebResource> {
  const { url, format, timeoutMs } = opts;
  const fetchImpl = opts.fetchImpl ?? fetch;
  assertHttpUrl(url);
  // One deadline shared by both attempts — the retry doesn't reset the clock.
  const signal = AbortSignal.timeout(timeoutMs);
  const headers = buildWebFetchHeaders(format);
  let response: Response;
  try {
    response = await fetchImpl(url, { headers, signal });
    if (
      response.status === 403 &&
      response.headers.get("cf-mitigated") === "challenge"
    ) {
      response = await fetchImpl(url, {
        headers: { ...headers, "User-Agent": FALLBACK_USER_AGENT },
        signal,
      });
    }
  } catch (error) {
    if (signal.aborted) {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s: ${url}`);
    }
    throw error;
  }
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${url}`);
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && Number.parseInt(contentLength, 10) > WEB_FETCH_MAX_RESPONSE_BYTES) {
    throw new Error(
      `Response too large (content-length exceeds the ${WEB_FETCH_MAX_RESPONSE_BYTES}-byte limit): ${url}`,
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > WEB_FETCH_MAX_RESPONSE_BYTES) {
    throw new Error(
      `Response too large (exceeds the ${WEB_FETCH_MAX_RESPONSE_BYTES}-byte limit): ${url}`,
    );
  }
  return {
    body: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type") ?? "",
    // Some fetch stubs/implementations leave Response.url empty; fall back to
    // the request URL so callers can always compare for cross-host redirects.
    finalUrl: response.url === "" ? url : response.url,
  };
}

/** Clamp the model-supplied timeout (seconds) into the allowed range, in ms. */
export function resolveWebFetchTimeoutMs(timeoutSeconds: number | undefined): number {
  const seconds = timeoutSeconds ?? WEB_FETCH_DEFAULT_TIMEOUT_SECONDS;
  return Math.min(Math.max(seconds, 1), WEB_FETCH_MAX_TIMEOUT_SECONDS) * 1000;
}
