# The instruction stack

## The decision

The SDK ships the **operational prose** alongside the tools: `workflow`
(explore before edit, read before edit, reproduce a bug before fixing it,
verify, finish before ending the turn), `planning` (the framework `todo`
tool's contract), `communication` (lead with the outcome, match length to the
ask, take a position, structure deliberately, report precisely, act without
permission-seeking),
`hitl` (the `ask_question` playbook), `parallelTools` (the background-work
scheduling policy), `subagents` (the delegation playbook + roster routing),
and `repoConventions` ([10](./10-repo-conventions-injection.md)). Each is
parameterized like the tools (`workspaceNoun`) and built once per session
([04](./04-prompt-cache-stability.md)).

**The prescribed wiring is one composed instruction** —
`stdlib.instructions.stack`, every section rendered in a canonical order
(repo-conventions → workflow → planning → parallel-tools → subagents → media
→ hitl → communication). eve orders instruction slots alphabetically by
filename, so per-section re-export files put the prompt in alphabetical
order; the one-file stack is what makes section order a design decision. The
sections stay exported à la carte for declared subagent dirs, which inherit
nothing and want a subset.

**Sections are the consumer surface.** Each section is a `PromptSection`
(`id`/`heading`/`body`, `src/prompt-sections.ts` — framework-free), and the
stack takes composition edits, not prose edits: `omitSections` drops a
baseline section by id, `extraSections` splices consumer sections in at an
anchored spot (`{ after: "workflow" }`), with a function form evaluated on
`session.started` for per-session catalogs (rib's skills). An unknown anchor
appends rather than throws.

**The stack travels with both topologies.** `createSandboxFileTools` returns
the same stack pre-configured for the split topology: `workspaceRoot` is
optional on the stack, and without it the baseline carries no
repo-conventions section — the workspace's root `AGENTS.md` lives in the
sandbox and eve's instruction resolvers (`DynamicResolveContext`) have no
sandbox access, so the section *can't* be built there; nested conventions
still deliver through the read tool's per-call riders
([10](./10-repo-conventions-injection.md)). `parallel-tools` is dropped too
(the sandbox toolset ships no SDK bash/tasks). Symmetric with `media`, which
only renders when an oracle is wired: a section that can't be honest about
its topology doesn't render at all.

**Two tiers, one source.** Every section is authored in `full` (numbered
rules, worked examples) and `compact` (same contracts, tighter prose) in the
same builder function, selected by `instructionTier`. Tests pin tier parity
— the same load-bearing tool names and thresholds must appear in both, and
compact must actually be shorter — so the tiers can't drift the way
hand-maintained prompt forks do.

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

The composed stack, tiers, and planning section came from codex — the
learning-from-codex note's anatomy of its two shipped prompts: one document
of deliberately ordered sections (not alphabetical fragments), a full and a
compact variant of the *same* sections for different models (with the
explicit warning that hand-maintained forks drift — hence tiers in one
builder, pinned by parity tests), and a real planning section for the
harness's plan tool where eve ships `todo` with no guidance (the same gap
the HITL section fills for `ask_question`). The reproduce-before-fix
workflow rule is from SWE-bench harness research: repro-first discipline is
universal among top performers, and neither codex's prompts nor ours had it.

## Sources

- `journal/team/harness-research/2026-07-02-learning-from-cursor.md` §2, §3, §5.
- `journal/team/harness-research/2026-07-08-learning-from-codex.md` — prompt
  anatomy, per-model tiers, the plan-tool section.
- `rib/learnings/05-parallel-tool-orchestration.md` — the prompting half of
  the task machinery.
- `rib/learnings/23-subagent-stream-topology.md` — the delegation playbook.
