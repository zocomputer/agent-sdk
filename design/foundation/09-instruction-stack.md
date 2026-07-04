# The instruction stack

## The decision

The SDK ships the **operational prose** alongside the tools: `workflow`
(explore before edit, read before edit, verify, todo tracking, finish before
ending the turn), `communication` (lead with the outcome, readable over
brief, report-don't-fix, act without permission-seeking),
`hitl` (the `ask_question` playbook), `parallelTools` (the background-work
scheduling policy), `subagents` (the delegation playbook + roster routing),
and `repoConventions` ([10](./10-repo-conventions-injection.md)). Each is a
one-file re-export in the consuming agent, parameterized like the tools
(`workspaceNoun`) and built once per session
([04](./04-prompt-cache-stability.md)).

**Persona stays consumer-owned.** The stack ships behavior contracts, not
voice — an agent's identity is its own instruction file.

## Why: the tools underperform without the workflow prose

The clearest finding from reading Cursor's harness from the inside: its
persona is one sentence, and everything else — the part doing visible heavy
lifting — is operational contracts with worked examples. The behaviors that
make a coding agent feel competent (explore before editing, verify after,
lead with the outcome, don't ask permission for reversible actions, "if your
last paragraph is a plan, do the work now") are prompt engineering that every
consumer would otherwise re-derive badly. They're also inseparable from the
tools: the task machinery without the scheduling policy gets treated like a
weird shell result; `ask_question` without the playbook gets called with
open-ended questions when enumerable options would serve better.

The HITL case sharpened the boundary: eve's `ask_question` tool is
well-designed (structured options with `style`/`description`,
`allowFreeform`), but the framework gives the model a one-sentence
description and no usage guidance — and the tool is harness-owned, so an app
can't extend the description. The guidance *has* to travel as an instruction.
That generalizes: instructions are the SDK's channel for teaching behavior on
surfaces it doesn't own.

## The line we drew

Ship: operational contracts that transfer to any workspace agent. Keep out:
persona/voice, anything repo-specific (repo flavor enters via options), and
anything still being proven in rib. The split mirrors what the whole package
does with code — extract the stable, keep the experimental at home.

## The inspiration

Cursor's prompt architecture, directly — the learning-from-Cursor note's §2
("ship the instructions stack, not just the tools — the SDK's real gap") is
the design brief this feature implemented, and several communication lines
(lead with the outcome; the end-of-turn check that converts trailing "I'll
now…" text into a self-trigger) are adapted from prose demonstrably working
in that harness. rib's `instructions.md` was the in-house draft; the stack is
its extraction.

## Sources

- `journal/ben/rib/2026-07-02-learning-from-cursor.md` §2, §3, §5.
- `rib/learnings/05-parallel-tool-orchestration.md` — the prompting half of
  the task machinery.
- `rib/learnings/23-subagent-stream-topology.md` — the delegation playbook.
