import mammoth from "mammoth";

// DOCX → plain text via mammoth. Raw text (not HTML/markdown): the model
// wants the words, and `read_file`'s line-numbered view supplies structure.

/**
 * Result of DOCX extraction: either plain text (not HTML/markdown — the model
 * wants the words, and read's line-numbered view supplies structure), or a
 * failure reason.
 */
export type DocxExtraction =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly reason: string };

/**
 * Extract DOCX bytes into plain text via mammoth. Paragraph breaks are
 * normalized (mammoth ends every paragraph with two newlines; the trailing
 * run is collapsed to one).
 */
export async function extractDocx(buffer: Buffer): Promise<DocxExtraction> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    // mammoth ends every paragraph with "\n\n"; collapse the trailing run.
    return { ok: true, text: result.value.replace(/\n+$/, "\n") };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
