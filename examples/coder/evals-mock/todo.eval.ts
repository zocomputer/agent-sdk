import { defineEval } from "eve/evals";

// The checklist lifecycle through eve's real todo framework tool: write the
// list, update it (completed/cancelled), then wrap up — two todo calls in
// order, ending in the scripted completion text.
export default defineEval({
  description: "[mock:todo] writes then updates the checklist and wraps up.",
  tags: ["mock"],
  async test(t) {
    const turn = await t.send("Checklist please [mock:todo]");
    turn.succeeded();
    turn.calledTool("todo", { count: 2 });
    turn.toolOrder(["todo", "todo"]);
    turn.messageIncludes("checklist scenario complete");
  },
});
