# Rich reads through one tool

## The decision

PDFs, DOCX, and spreadsheets are handled by **text extraction routed through
the existing `read` window** — same tool, same offset/limit pagination, same
output budget. `read` sniffs the file kind after its stat guard (extension
confirmed by magic bytes) and routes: PDF → per-page text via PDFium WASM with
`=== page N of M ===` markers, DOCX → raw text, spreadsheets → per-sheet TSV
with dimension headers. Images return structured metadata (the bytes reach the
model separately — see [08](./08-park-delivery.md)). Unknown binary gets a
structured rejection naming the detected type. `webfetch` routes fetched
documents through the same extractors, so a URL and a local file read
identically.

## Why: the winning interface is no new interface

A 200-page PDF should page exactly like a big `.ts` file. Every harness that
routes documents through a separate tool or plugin pays in model confusion —
the model has to learn a second reading interface and decide which one
applies. Extraction through `read` is boring and works with every model.

The road not taken — multimodal tool results (handing the model the PDF as an
attachment) — is the fragile path, on evidence:

- **opencode's PDF-as-attachment has been broken across providers for
  months**, with one failure mode tokenizing base64 as text: a 500–600×
  context blowup.
- **eve forbids it anyway**: tool results are text/json-only, enforced at
  runtime. (The runtime underneath has since merged content pass-through;
  exposing it is on the upstream-asks list, and would improve *images*, not
  the document story — extracted text is the right form for documents
  regardless.)

Two transferable rules came out of the survey:

- **Honest gaps.** A scanned PDF page with no text layer keeps its page
  marker plus a "likely scanned" line — so the model knows the gap is the
  file's, not the extractor's.
- **Failures must say what to do instead.** The error string lands verbatim
  in the transcript; a bare parser error wastes the turn.

## Mechanics worth keeping

Extractors are pure `Buffer → text` modules with fixture tests; deps are
WASM/pure-JS only (no native postinstalls); extraction is cached by path +
stat so repeat `offset` reads are free. On `webfetch`, HTML is reduced to its
main content under a title/byline metadata header (defuddle, with a
falls-back-when-over-pruned guard) — the hostagent lesson that the model
should get the article, not the website, and provenance without a second
fetch.

## Sources

- `rib/learnings/17-rich-filetype-reads.md` — the design and the eve
  constraint.
- `plans/ben/rib-rich-filetypes.md` — the full survey.
- `plans/ben/agent-sdk-hostagent-lessons.md` — the webfetch
  extraction/metadata/honest-failure work (hostagent's 929-line
  `read_webpage` vs our 230-line start).
