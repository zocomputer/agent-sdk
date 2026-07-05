import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

// The full HITL round trip on the real eve stack: the scripted ask_question
// call parks the turn with styled options + freeform, and answering resumes it
// to the wrap-up text. This is the deterministic twin of evals/hitl/ — same
// park/resume machinery, zero credentials.
export default defineEval({
  description: "[mock:hitl] parks on ask_question and resumes to the wrap-up after an answer.",
  tags: ["mock", "hitl"],
  async test(t) {
    const asked = await t.send("Run the HITL check [mock:hitl]");
    asked.parked();

    const request = t.requireInputRequest({ toolName: "ask_question" });
    await t.require(
      request.options?.length,
      satisfies((n) => n === 3, "the scripted question offers its three options"),
    );
    const primary = request.options?.find((option) => option.id === "ship");
    await t.require(
      primary?.style,
      satisfies((style) => style === "primary", "the ship option carries its primary style"),
    );

    const resumed = await t.respond({ requestId: request.requestId, optionId: "ship" });
    resumed.succeeded();
    resumed.messageIncludes("resumed and finished cleanly");
  },
});
