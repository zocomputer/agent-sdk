import { defineEval } from "eve/evals";
import { readReports, reportFilePath } from "./report";

// The repair path, end to end: turn 1 plants a `[fact:…]` marker, the tiny
// window (CODER_MOCK_WINDOW_TOKENS=256) forces eve to compact before turn 2,
// the mock's canned compaction summary drops the fact, the judge flags it,
// withValidatedCompaction appends the recovered-context section to the
// summary in place — and `[mock:recall]` proves the repaired summary actually
// reached the next turn's prompt by echoing that section back in-band.
//
// Also asserts through the observability seam: the onValidation NDJSON report
// (CODER_COMPACTION_REPORT_FILE, wired in agent/agent.ts) must contain a
// `repaired` entry naming the planted token.

const FACT_TOKEN = "harbor-beacon-7391";

export default defineEval({
  description:
    "Compaction drops a planted fact; the judge repairs the summary and the next turn can read it.",
  tags: ["compaction"],
  async test(t) {
    const planted = await t.send(
      `Remember this token for later: [fact:${FACT_TOKEN}]. Now tell me about the harbor tonight.`,
    );
    planted.succeeded();

    // The tiny window guarantees eve compacts before this turn's model call;
    // the recall scenario echoes any recovered-context section it finds in
    // the prompt, or says none was there.
    const recall = await t.send("[mock:recall]");
    recall.succeeded();
    recall.usedNoTools();
    recall.messageIncludes("Recovered context found in the prompt");
    recall.messageIncludes(FACT_TOKEN);

    const reports = readReports(reportFilePath());
    const repaired = reports.filter((report) => report.kind === "repaired");
    if (!repaired.some((report) => report.facts.some((fact) => fact.includes(FACT_TOKEN)))) {
      throw new Error(
        `No "repaired" validation report recovering ${FACT_TOKEN} — got kinds: ${JSON.stringify(
          reports.map((report) => report.kind),
        )}`,
      );
    }
  },
});
