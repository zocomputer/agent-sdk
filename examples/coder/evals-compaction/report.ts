import { readFileSync } from "node:fs";

// Shared readers for the suite's onValidation NDJSON report file
// (CODER_COMPACTION_REPORT_FILE, written by agent/agent.ts's mock branch).
// The file is shared across the suite's evals, so assertions over it are
// contains-style, never positional.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse the NDJSON report file into loose `{kind, facts}` rows (bad lines drop). */
export function readReports(file: string): { kind: string; facts: string[] }[] {
  const rows: { kind: string; facts: string[] }[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isRecord(value) || typeof value.kind !== "string") continue;
    const facts = Array.isArray(value.facts)
      ? value.facts.filter((fact): fact is string => typeof fact === "string")
      : [];
    rows.push({ kind: value.kind, facts });
  }
  return rows;
}

/** The suite's report file, or throw with a pointer at the launcher. */
export function reportFilePath(): string {
  const file = process.env.CODER_COMPACTION_REPORT_FILE;
  if (file === undefined || file === "") {
    throw new Error(
      "CODER_COMPACTION_REPORT_FILE is not set — run this suite via `bun run eval:compaction`.",
    );
  }
  return file;
}
