// Jupyter notebook (.ipynb) → text. A notebook is JSON, but reading it raw
// wastes the view budget on structure and can blow it entirely on one
// base64 output blob. Render cells under `=== cell N of M (type) ===`
// markers: markdown verbatim, code fenced with the notebook's language,
// outputs as text with `[image/png output]` stubs for binary data.
// Dependency-free (pure JSON walking).

/**
 * Result of notebook extraction: text with explicit cell markers plus the
 * cell count, or a failure reason (malformed JSON, a pre-v4 nbformat).
 */
export type NotebookExtraction =
  | { readonly ok: true; readonly text: string; readonly cells: number }
  | { readonly ok: false; readonly reason: string };

// nbformat "multiline strings" are strings or arrays of line strings.
function joinSource(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.filter((line): line is string => typeof line === "string").join("");
  }
  return "";
}

// Jupyter tracebacks carry ANSI color escapes; strip them for the transcript.
const ANSI_ESCAPE = /\u001b\[[0-9;]*[A-Za-z]/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function renderOutput(output: unknown): string[] {
  if (!isRecord(output)) return [];
  const lines: string[] = [];
  switch (output["output_type"]) {
    case "stream": {
      const text = joinSource(output["text"]).trimEnd();
      if (text.length > 0) lines.push(text);
      break;
    }
    case "execute_result":
    case "display_data": {
      const data = isRecord(output["data"]) ? output["data"] : {};
      const plain = joinSource(data["text/plain"]).trimEnd();
      if (plain.length > 0) lines.push(plain);
      for (const mime of Object.keys(data)) {
        // Binary/rich payloads (images, widgets, HTML) become one-line
        // stubs — the bytes are useless in a text transcript.
        if (mime !== "text/plain") lines.push(`[${mime} output]`);
      }
      break;
    }
    case "error": {
      const name = typeof output["ename"] === "string" ? output["ename"] : "Error";
      const value = typeof output["evalue"] === "string" ? output["evalue"] : "";
      lines.push(`${name}: ${value}`);
      const traceback = output["traceback"];
      if (Array.isArray(traceback)) {
        for (const frame of traceback) {
          if (typeof frame === "string") lines.push(frame.replace(ANSI_ESCAPE, ""));
        }
      }
      break;
    }
    default:
      break;
  }
  return lines;
}

function notebookLanguage(notebook: Record<string, unknown>): string {
  const metadata = isRecord(notebook["metadata"]) ? notebook["metadata"] : {};
  const languageInfo = isRecord(metadata["language_info"]) ? metadata["language_info"] : {};
  if (typeof languageInfo["name"] === "string") return languageInfo["name"];
  const kernelspec = isRecord(metadata["kernelspec"]) ? metadata["kernelspec"] : {};
  if (typeof kernelspec["language"] === "string") return kernelspec["language"];
  return "";
}

/**
 * Extract Jupyter notebook bytes (nbformat 4) into text with per-cell
 * markers. Fails with a readable reason on malformed JSON or the legacy
 * nbformat 3 layout.
 */
export function extractNotebook(bytes: Uint8Array): NotebookExtraction {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("utf8"));
  } catch (error) {
    return {
      ok: false,
      reason: `not valid JSON (${error instanceof Error ? error.message : String(error)})`,
    };
  }
  if (!isRecord(parsed)) return { ok: false, reason: "not a JSON object" };
  const cells = parsed["cells"];
  if (!Array.isArray(cells)) {
    if (Array.isArray(parsed["worksheets"])) {
      return {
        ok: false,
        reason:
          "this is an nbformat 3 notebook — convert it with `jupyter nbconvert --to notebook` first",
      };
    }
    return { ok: false, reason: "no cells array — this does not look like a notebook" };
  }
  const language = notebookLanguage(parsed);
  const parts: string[] = [];
  for (const [i, cell] of cells.entries()) {
    if (!isRecord(cell)) continue;
    const type = typeof cell["cell_type"] === "string" ? cell["cell_type"] : "unknown";
    parts.push(`=== cell ${i + 1} of ${cells.length} (${type}) ===`);
    const source = joinSource(cell["source"]).trimEnd();
    if (type === "code") {
      parts.push(`\`\`\`${language}`);
      parts.push(source);
      parts.push("```");
      const outputs = cell["outputs"];
      if (Array.isArray(outputs)) {
        for (const output of outputs) parts.push(...renderOutput(output));
      }
    } else if (source.length > 0) {
      parts.push(source);
    }
  }
  return { ok: true, text: parts.join("\n"), cells: cells.length };
}
