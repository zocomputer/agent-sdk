# Background tasks

## The decision

Long-running work is a managed task, not a blocked turn:

- **`bash` is adaptive**: it waits a short foreground window, then
  auto-backgrounds a still-running command and returns a `task_id`. The agent
  doesn't need to know in advance whether a command will be slow.
- **`run_async` / `check_tasks` / `await_task`** are the explicit machinery:
  start a known-backgroundable operation, inspect bounded progress, collect
  the final result. Any `defineOp` op becomes `run_async`-able via
  `extraBackgroundables`.
- **The registry is persisted and restart-honest**: completed results survive
  restarts; tasks running across a restart report as `lost`, never silently
  "running." It's also deduped on `globalThis` per store path, because eve's
  mid-session rebuild forks module graphs — module scope is not process
  scope in a hot-reloading harness, and the registry must be anchored to the
  process and the store, never the module.

## Why

Coding agents routinely block on work that isn't on the critical path — test
suites, builds, installs, dev servers, CI waits — while they could be reading,
editing, or starting the next check. eve already runs a *step's* tool calls
concurrently; this machinery adds **cross-step scheduling**: start now, keep
working, decide later whether to await.

Naive spawning isn't enough. The abstraction that works is "tool call with
progress," and it needs five properties: **identity** (stable task ids),
**bounded progress** (tails, not unbounded logs), **finality** (an explicit
await that returns the real result), **persistence** (restart honesty), and
**prompting** — a standing instruction that gives the model a scheduling
policy (continue when independent, await when dependent, account for all
background work before ending the turn). Without the prose, the model treats
a task handle like a weird shell result; the instruction is as load-bearing as
the registry ([09](./09-instruction-stack.md)).

Mutation stays synchronous: read-only and external-wait work backgrounds
safely; file edits do not, so `edit`/`write` are deliberately not
backgroundable.

## The inspiration

The adaptive foreground-window-then-background shape mirrors Cursor's `Shell`
(`block_until_ms`), read from the inside during the learning-from-Cursor study.
The persistence and lost-state
semantics are rib's own, forced by real restarts; the `globalThis` dedupe was
forced by a real split-brain (`await_task` failing "No such task" on a task
`bash` had just spawned).

## Sources

- `rib/learnings/03-background-tool-execution.md` — the managed-task shape.
- `rib/learnings/05-parallel-tool-orchestration.md` — the scheduling-policy
  lesson.
- `rib/learnings/22-rebuild-splits-module-state.md` — the registry split-brain
  and fix.
- `journal/team/harness-research/2026-07-02-learning-from-cursor.md` §4 — the
  background-shell design.
