import { openPdf } from "clawpdf";

// PDF → text via clawpdf (PDFium compiled to WASM; no native addons). Pages
// are joined under explicit markers so the model can cite page numbers and
// `read`'s offset/limit pagination has stable anchors.

export type PdfExtraction =
  | { readonly ok: true; readonly text: string; readonly pages: number }
  | { readonly ok: false; readonly reason: string };

// Shown in place of a page with no text layer. eve tool results are
// text/json only, so the agent can't fall back to rendering the page for the
// model the way OpenClaw does — say so instead of showing silent emptiness.
export const PDF_EMPTY_PAGE_NOTE =
  "[no text on this page — likely scanned or image-only; rendered pages cannot be attached]";

// Extraction page cap. `read`'s view budget paginates the *text*; this bounds
// the extraction work itself, so a 10,000-page PDF doesn't churn PDFium for
// pages nobody asked for. `pages` still reports the true total.
export const PDF_PAGE_CAP = 200;

export async function extractPdf(
  bytes: Uint8Array,
  options: { readonly pageCap?: number } = {},
): Promise<PdfExtraction> {
  const pageCap = options.pageCap ?? PDF_PAGE_CAP;
  let pdf: Awaited<ReturnType<typeof openPdf>>;
  try {
    pdf = await openPdf(bytes);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
  try {
    const pages = pdf.pageCount;
    const extracted = Math.min(pages, pageCap);
    const parts: string[] = [];
    for (let n = 1; n <= extracted; n++) {
      // PDFium emits \r\n line separators; normalize to the repo's \n.
      const text = pdf.page(n).text().replaceAll("\r\n", "\n").trim();
      parts.push(`=== page ${n} of ${pages} ===`);
      parts.push(text.length > 0 ? text : PDF_EMPTY_PAGE_NOTE);
    }
    if (extracted < pages) {
      parts.push(
        `[extraction stopped at the page cap — ${extracted} of ${pages} pages extracted]`,
      );
    }
    return { ok: true, text: parts.join("\n"), pages };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    await pdf[Symbol.asyncDispose]();
  }
}
