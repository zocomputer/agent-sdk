import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

// Two ask_question calls in ONE model response must pend on a single park and
// resume off one respond — eve's input protocol carries pending requests
// plural, and this pins that batching contract deterministically: the mock
// always emits exactly two calls, so a regression can't hide behind model whim.
export default defineEval({
  description: "[mock:parallel] parks two ask_question requests together and resumes on one respond.",
  tags: ["mock", "hitl"],
  async test(t) {
    const asked = await t.send("Two decisions please [mock:parallel]");
    asked.parked();

    const pending = t.pendingInputRequests;
    await t.require(
      pending.length,
      satisfies((n) => n === 2, "both scripted questions pend on a single park"),
    );

    const responses = pending.map((request) => {
      const optionId = request.options?.[0]?.id;
      if (!optionId) throw new Error(`request ${request.requestId} offered no options`);
      return { requestId: request.requestId, optionId };
    });
    const resumed = await t.respond(...responses);
    resumed.succeeded();
    resumed.messageIncludes("parallel HITL scenario finished cleanly");
  },
});
