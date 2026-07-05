import { defineEval } from "eve/evals";

// The unpaced burst: every delta arrives as fast as eve can pump them (the
// renderer-throughput probe). End to end it must still assemble the complete
// message — a dropped delta under pressure would show up as a missing trailer.
export default defineEval({
  description: "[mock:burst] survives an unpaced delta flood with the full message intact.",
  tags: ["mock"],
  async test(t) {
    const turn = await t.send("Throughput probe [mock:burst]");
    turn.succeeded();
    turn.usedNoTools();
    turn.messageIncludes("Burst:");
    turn.messageIncludes("Burst done.");
  },
});
