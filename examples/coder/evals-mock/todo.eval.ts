import { defineEval } from "eve/evals";

// The checklist lifecycle through the SDK's discipline-enforcing `todo`
// wrapper (over eve's framework state): write the list, update it
// (completed/cancelled), then wrap up — two todo calls in order, both legal
// under the write rules (todo-discipline.test.ts pins that), ending in the
// scripted completion text. A rule change that outlaws the script fails the
// wrapper's calls here end-to-end.
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
