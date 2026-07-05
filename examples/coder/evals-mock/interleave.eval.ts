import { defineEval } from "eve/evals";

// Alternating reasoning and text blocks in one message — the shape
// extended-thinking models actually stream. Both text blocks must land in the
// final message; the reasoning blocks must not leak into it.
export default defineEval({
  description: "[mock:interleave] lands both text blocks and keeps reasoning out of the message.",
  tags: ["mock"],
  async test(t) {
    const turn = await t.send("Think out loud [mock:interleave]");
    turn.succeeded();
    turn.usedNoTools();
    turn.messageIncludes("The tide tables say low water at dusk.");
    turn.messageIncludes("interleave scenario complete");
  },
});
