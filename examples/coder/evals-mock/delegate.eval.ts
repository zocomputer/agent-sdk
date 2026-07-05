import { defineEval } from "eve/evals";

// Real subagent delegation on the mock: the parent's scripted call spawns the
// declared task_fast child (which also runs the mock under CODER_MOCK_MODEL=1),
// the child streams its report, and the parent wraps up. Pins the whole
// declared-subagent path — spawn, child session, result handoff — end to end.
//
// Generous timeout: this eval runs first alphabetically, so on a cold CI
// runner it absorbs the eve server's initial compile of the whole agent graph
// — and the task child is a full-toolset clone-alike, a much bigger subagent
// node than the old three-tool explore child (120s flaked on the 2-core
// runner; passes locally in seconds).
export default defineEval({
  description: "[mock:delegate] delegates to the task_fast subagent and wraps up.",
  tags: ["mock", "subagent"],
  timeoutMs: 240_000,
  async test(t) {
    const turn = await t.send("Delegate the survey [mock:delegate]");
    turn.succeeded();
    t.calledSubagent("task_fast");
    turn.messageIncludes("delegation scenario complete");
  },
});
