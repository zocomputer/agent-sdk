# The model-tier task subagent kit

## The decision

The SDK ships a preset for **generic, model-tier task subagents** — declared
children that are full-capability copies of the parent pinned to a
caller-chosen model: `createTaskAgent` (the `defineAgent` config whose
parent-facing description carries the model's identity, the when-to-pick-it
guidance, and the delegation contract), `createTaskInstruction` (the child's
operating contract), `expectedTaskToolNames` + `TASK_DISABLED_BUILTINS` (the
manifest a consumer's test diffs each tier's `tools/` directory against), and
`fetchGatewayModelCatalog` (the one-shot source for checked-in model blurbs).
A `subagentRoster` option on the stdlib teaches the parent when to route to
each tier. This replaced the earlier read-only explore preset: exploration is
just one use of a generic worker on a cheap model.

## Why tool-per-tier instead of a model parameter

eve lowers every subagent into a model-visible tool with the fixed input
`{ message, outputSchema? }`, and a subagent's model is compiled from its
`agent.ts` — there is no per-call model override anywhere in the runtime
(verified against 0.16 and 0.19). So "let the caller choose the model" must be
encoded in the tool surface: one declared subagent directory per tier
(`task_fast`, `task_deep`), model choice = tool choice. That turns out to be a
good interface for a model anyway — the routing signal lives in tool
descriptions, which is where the parent reads guidance, rather than in an enum
the description would have to explain.

## Why full parent parity, constructed

A declared subagent inherits *nothing* from the root, and an unauthored slot
falls back to the **framework default**, not the parent's version. A generic
worker should have "the same tools as the parent" — so parity must be
constructed: one one-line re-export per parent tool file (the parent's own
disable shims included, so a vacated name stays vacated in the child), minus
an explicit exclusion list for parent-session-coupled tools (rib excludes its
cockpit tools), plus a `disableTool()` shim for `ask_question`.

`expectedTaskToolNames` exists so a consumer test can pin that arithmetic:
(parent `tools/` set − exclusions) + shims == (child `tools/` set), with a
throw on a stale exclusion. The test *is* the parity property — a parent tool
added without a re-export otherwise ships silently, and the child's actual
surface drifts from what its description advertises. rib's manifest suite
additionally checks each re-export is the parent's *instance*
(`expect(childMod.default).toBe(parentMod.default)`), so a diverged copy
can't masquerade as parity.

The shim list is one entry, and it carries the delegation contract:
`ask_question` in a child parks the **parent's** turn, so the task instruction
says decide-and-report — make the reasonable call and note it, or report the
blocker as the result. One built-in the kit *wants* to shim but can't: the
`agent` clone tool. eve injects it at the harness layer, so a `disableTool()`
shim for it fails runtime agent-graph resolution; the instruction bounds
onward delegation ("never chain more than one level deeper") instead.

## Why blurbs are fetched once and checked in

The tier descriptions embed the model's own catalog description ("what is
Sonnet 5 good at"), sourced from the AI Gateway's public model catalog — the
same data the AI SDK's `gateway.getAvailableModels()` returns. But tool
descriptions are part of the cached prompt prefix
([04](./04-prompt-cache-stability.md)) and compile into the agent bundle, so a
live fetch would make the prefix nondeterministic and the build
network-dependent. The kit therefore ships `fetchGatewayModelCatalog` for
**one-shot refresh scripts** (rib: `scripts/refresh-model-blurbs.ts`
regenerating a generated, checked-in module), never a runtime path.

## What the child re-exports beyond tools

Instructions don't inherit either: the child gets `createTaskInstruction`
(final message is the entire deliverable, cite paths + line refs, honor the
requested thoroughness, stay in the assigned write scope, and return a
structured Findings/Recommendation/Artifacts report targeting ~500–1500
tokens — a delegation pays for itself in context kept out of the parent, so
the return shape is spelled out rather than left to "report back") plus
re-exports of
the stdlib's `repoConventions`, `workflow`, and `parallelTools` — a
write-capable worker needs the same how-to-work contract as the parent.
Hooks don't inherit: a session-log hook must be re-exported or child sessions
vanish from the consumer's records. The park-delivery hook is deliberately
*not* wired — a task child never parks awaiting input (`ask_question` is
shimmed off), so queued deliveries would never send, and a mistaken send
would start an invisible extra turn on the child. That absence makes the
parent's attachment-enabled `read`/`webfetch` dishonest in a child, so those
two are the one exception to parity-by-re-export: `createTaskChildTools`
builds attach-disabled instances with report-the-path hints
(`TASK_CHILD_TOOL_OVERRIDES`), and the manifest suite pins that they diverge
from the parent's instances while everything else stays identity-equal.

## The inspiration

Claude Code's Task tool and Cursor's subagent roster — a generic delegation
primitive where the caller picks capability tier per call — mapped onto eve's
declared-subagent mechanism, which fixes the input schema and compiles the
model per directory. The clone topology groundwork (parent stream as control
plane, attach to the child session for the transcript) came from rib's
subagent work.

## Sources

- `rib/learnings/37-model-tier-subagents.md` — the tool-per-tier encoding and
  the parity manifest.
- `rib/learnings/28-declared-subagent-isolation.md` — the fallback-open trap,
  non-inheritance, and the manifest-test pattern (born with the explore
  preset, inherited by this kit).
- `rib/learnings/23-subagent-stream-topology.md` — the delegation topology.
