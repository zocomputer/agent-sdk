import { defineEval } from "eve/evals";
import { readReports, reportFilePath } from "./report";

// The no-repair path: no `[fact:…]` marker in the transcript, so the judge
// answers NOTHING MISSING and withValidatedCompaction leaves the summary
// untouched — `[mock:recall]` finds no recovered-context section in the
// prompt, and the NDJSON report records a `nothing-missing` verdict. Pins
// that validation doesn't inject noise into clean compactions.
export default defineEval({
  description:
    "A clean compaction validates as nothing-missing and the summary is left unrepaired.",
  tags: ["compaction"],
  async test(t) {
    const filler = await t.send("Tell me about the harbor tonight.");
    filler.succeeded();

    // The tiny window still forces a compaction before this turn — but with
    // nothing planted, the summary must pass the audit unmodified.
    const recall = await t.send("[mock:recall]");
    recall.succeeded();
    recall.usedNoTools();
    recall.messageIncludes("No recovered context in the prompt");

    const reports = readReports(reportFilePath());
    if (!reports.some((report) => report.kind === "nothing-missing")) {
      throw new Error(
        `No "nothing-missing" validation report — got kinds: ${JSON.stringify(
          reports.map((report) => report.kind),
        )}`,
      );
    }
  },
});
