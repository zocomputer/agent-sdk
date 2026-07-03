# Prompt-cache stability

## The decision

The prompt prefix — system prompt, dynamic instructions, tool definitions —
is **write-once per session**. Every SDK description and instruction is built
exactly once, on `session.started`, and stays byte-identical afterward.
Anything that varies per turn (a running-task count, an in-flight list) rides
a **tool result**, which appends to the transcript without touching the
prefix. The API shape enforces it: factories take their variability as options
(`workspaceNoun`, `bashInteractiveHint`) and interpolate them once at build
time — options in, static strings out.

## Why: the cache is an economic constraint, not an optimization

Anthropic-style prompt caching matches an exact prefix. One byte of per-turn
drift re-writes the whole prefix at roughly 10× read cost (cache read ≈ 0.1×
base input, write ≈ 1.25×), plus the latency of re-ingesting it — and the
damage compounds on exactly the sessions that matter most: long, heavy,
multi-task turns late in a big context.

This wasn't hypothetical. rib's first parallel-tools implementation broke the
cache in two places — an in-flight task list rebuilt into the system prompt
every `turn.started`, and a live `(${running} currently running)` counter
inside a tool description rebuilt every `step.started`. Both were considered
choices made without the cache economics in view, and both were invisible on
a bill (`gateway-auto` caching surfaces nothing by default). The fix — counts
move into `check_tasks`' *result*, all resolvers pin to `session.started` —
was then measured: full-prefix cache hit on turn 2, with the write reduced to
the incremental turn tail.

## The inspiration

hermes states it as doctrine — "prompt caching is sacred," with compaction as
the sole sanctioned prefix rewrite — and openclaw independently goes as far as
impersonating Claude Code's tool names partly to inherit its cache priors.
Cursor's harness, read from the inside, follows the same discipline: a static
prefix, with everything alive delivered as tool-result riders or user-message
attachments. Three unrelated projects converging on the same rule is the
strongest evidence the constraint is real. The SDK's contribution is baking it
into the API shape so a consumer can't casually regress it.

## Consequences elsewhere in the SDK

The rule shapes features that look unrelated:

- Nested `AGENTS.md` conventions arrive as read-result riders, never prompt
  mutations ([10](./10-repo-conventions-injection.md)).
- Mid-turn steering rides tool results ([12](./12-mid-turn-steering.md)).
- Background-task notifications arrive as a next user turn
  ([08](./08-park-delivery.md)) — a transcript append, not a prefix change.

Sanctioned exceptions: compaction, and a self-editing agent's hot reload —
both already re-price the session by design.

## Sources

- `journal/ben/rib/2026-07-01-prompt-cache-as-economic-constraint.md` — the
  audit, the two hazards, the measured numbers.
- `rib/learnings/15-context-budget-and-pruning.md` — the cost model and the
  cache-hit measurement.
- `journal/ben/rib/2026-07-01-hermes-vs-openclaw.md` — where both comps
  independently treat caching as architecture.
