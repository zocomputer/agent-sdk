# Prior-aligned naming

## The decision

Tool names and parameters follow what models already know from Claude Code and
opencode: lowercase `read` / `edit` / `write` / `glob` / `grep` / `bash`,
snake_case params (`old_string`, `replace_all`, `timeout_ms`), `path` not
`file_path`. Any result key the model must copy into a later call is spelled
exactly like the parameter that receives it (`bash` returns `task_id`;
`await_task` takes `task_id`). Names are model-facing API — they are not
renamed casually.

## Why

A model arrives with strong priors about its tool surface — the names, params,
and calling conventions it was trained and RL'd on. Matching those priors is
free correctness: the model already knows when to reach for `read` vs `grep`,
that `edit` wants a unique `old_string`, and what a `task_id` is for.
Diverging spends description budget re-teaching what the weights already know,
and invites near-miss hallucinations — calling the name it remembers instead
of the name you registered.

## The inspiration: the ecosystem already converged

| Harness | File tools | Params |
| --- | --- | --- |
| Claude Code | `Read`, `Edit`, `Write`, `Glob`, `Grep`, `Bash` | snake_case |
| opencode | the same set, lowercased — descriptions near-verbatim, limits identical | camelCase |
| openclaw | its internal tools **renamed to Claude Code's exact names** for Anthropic models ("stealth mode") | snake_case |
| Codex CLI | `shell`, `apply_patch` — OpenAI models have their own priors | snake_case |

The openclaw datapoint is the strongest: it maintains a case-insensitive
rename table purely for prior alignment — naming alone is worth a
compatibility layer to them. Nobody in the field uses `read_file` /
`write_file`; those were an eve-ism, and shedding them was one of rib's first
tool changes. We take the opencode shape (lowercase Claude Code names — max
prior overlap without TitleCase) with Claude's snake_case params, keeping
`path` over `file_path` because it's shorter and unambiguous in a
workspace-rooted toolset.

## Consequences

- **Vacating an eve built-in requires a shim.** eve injects every framework
  tool whose name the agent didn't take, so adopting `read`/`write` means
  shipping `disableTool()` shims for `read_file`/`write_file` — otherwise the
  model sees two file readers, a silent split-brain. The quick start
  prescribes the shims; the upstream ask (prior-aligned defaults, or
  config-level disable) is on the README's list.
- **SDK-specific tools keep descriptive names** (`run_async`, `check_tasks`,
  `await_task`, `webfetch`): no prior exists for them, so clarity wins over
  mimicry.

## Sources

- `rib/learnings/16-tool-naming-priors.md` — the survey, the rename, the
  echo-back rule, and a designed A/B misuse-rate experiment.
- `journal/ben/rib/2026-07-01-opencode-default-tools.md` — the per-harness
  naming table and opencode's model-conditional toolset swap.
