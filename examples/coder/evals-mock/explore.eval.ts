import { defineEval } from "eve/evals";

// Real subagent delegation on the mock: the parent's scripted call spawns the
// declared explore child (which also runs the mock under CODER_MOCK_MODEL=1),
// the child streams its report, and the parent wraps up. Pins the whole
// declared-subagent path — spawn, child session, result handoff — end to end.
export default defineEval({
  description: "[mock:explore] delegates to the explore subagent and wraps up.",
  tags: ["mock", "subagent"],
  timeoutMs: 120_000,
  async test(t) {
    const turn = await t.send("Delegate the survey [mock:explore]");
    turn.succeeded();
    t.calledSubagent("explore");
    turn.messageIncludes("delegation scenario complete");
  },
});
