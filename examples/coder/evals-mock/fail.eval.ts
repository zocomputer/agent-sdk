import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

// The failure path, made deterministic: the mock streams a few deltas then
// ends the stream in a terminal error part (no finish). eve fails the step and
// turn, then parks the session for a user retry — so the load-bearing pins are
// the VISIBLE `turn.failed` event (what a client's failed-turn notice keys on;
// a failure that only parks, with no failed event, looks like an eternal
// "Thinking…" to every UI) and the recoverable waiting state after it.
export default defineEval({
  description: "[mock:fail] surfaces turn.failed and parks the session for retry.",
  tags: ["mock"],
  async test(t) {
    const turn = await t.send("Break mid-stream please [mock:fail]");
    turn.event("turn.failed");
    turn.eventOrder([{ type: "step.failed" }, { type: "turn.failed" }]);
    await t.require(
      turn.status,
      satisfies((status) => status === "waiting", "the failed turn parks for a user retry"),
    );
  },
});
