import { defineEval } from "eve/evals";

// A completion with zero content parts — models do occasionally return
// nothing, and empty assistant messages have broken renderers before. The
// turn must still complete cleanly rather than wedge or fail.
export default defineEval({
  description: "[mock:empty] completes a turn that streamed no content at all.",
  tags: ["mock"],
  async test(t) {
    const turn = await t.send("Say nothing [mock:empty]");
    turn.succeeded();
    turn.usedNoTools();
  },
});
