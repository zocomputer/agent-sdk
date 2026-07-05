# Extracted from a working agent

## The decision

Every piece of this SDK shipped in rib — the coding agent that works on the Zo
monorepo — before it shipped here. The package extracts what rib proved:
patterns get proven under real daily use, written up as learning notes
(`rib/learnings/` in the monorepo), and lifted only once they've stabilized.
rib then becomes the first consumer of its own extracted parts, so the SDK is
never speculative — its APIs are shaped by the call sites that already exist.

## The shape it produced

- **One `createStdlib` call, everything à la carte too.** `createStdlib`
  returns the full prescribed wiring (tools + instructions + the task-kit
  options), but every factory (`createReadTool`, `createCommandRunner`,
  `createWorkflowInstruction`, …) and every lib module is exported
  individually. Consumers who want a subset compose it; consumers who want
  the whole thing make one call. This is the pi lesson — a harness earns
  adoption by staying reshapeable — applied to a library surface.
- **Wiring stays in the agent, one line per tool.** eve resolves
  `agent/tools/<name>.ts` by filename — the filename *is* the wire name the
  model sees — so the package can't register anything itself. The consuming
  agent re-exports (`export default stdlib.tools.read`) and ships its own
  `disableTool()` shims for vacated framework names. The SDK provides values;
  the agent owns the namespace.
- **Typed builders beside the type-erased registration.** eve's
  `defineDynamic` returns a sentinel that tests can't exercise. The pattern
  throughout: a typed builder (`buildTasksToolset(deps)` returning the real
  `{run_async, check_tasks, await_task}` record) carries all the logic and
  the unit tests; the `create*` factory is a one-line `defineDynamic` wrapper
  around it. Anything worth testing lives in the typed half.
- **Pure lib modules under the tools.** Extractors, truncation, glob
  matching, the file-view window, watchers — each is a framework-free module
  with a sibling `*.test.ts`. Tools stay thin over them. This discipline
  predates the extraction (it's what made the extraction cheap) and is why
  the package has meaningful unit coverage rather than integration scaffolds.

## Why extraction beats design

A tool surface for models is full of judgment calls that only usage settles:
how big a read window, when to background a command, what an error string
should tell the model to do next. rib generated hundreds of real transcripts
against every one of those calls before the code was public. The extraction
also enforced honesty retroactively — anything repo-specific (the skills
catalog coupled to the monorepo's symlink layout, session tools, cockpit
glue) visibly failed the "would another eve project want this?" test and
stayed behind.

## Sources

- `rib/learnings/18-agent-sdk-extraction.md` — the extraction mechanics.
- `rib/learnings/10-portable-agent-helpers.md` — the pure-helper discipline
  that made lifting cheap.
- `journal/ben/rib/2026-07-01-pi-and-the-malleable-harness.md` — the
  malleability study behind the à la carte surface.
