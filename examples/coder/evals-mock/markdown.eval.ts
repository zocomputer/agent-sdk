import { defineEval } from "eve/evals";

// Structure-heavy markdown split across deltas — fences opening in one delta
// and closing several later, tables row by row, unicode — must survive the
// full stack and land intact in the final message.
export default defineEval({
  description: "[mock:markdown] streams split-structure markdown that lands intact.",
  tags: ["mock"],
  async test(t) {
    const turn = await t.send("Render the stress page [mock:markdown]");
    turn.succeeded();
    turn.usedNoTools();
    turn.messageIncludes("```ts");
    turn.messageIncludes("| tide | bell | fog |");
    turn.messageIncludes("Done. ✅");
  },
});
