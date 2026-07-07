# Prior-aligned naming

## The decision

Tool names and parameters follow what models already know from Claude Code and
opencode: lowercase `read` / `edit` / `write` / `glob` / `grep` / `bash`,
snake_case params (`old_string`, `replace_all`, `timeout_ms`), `path` not
`file_path`. Any result key the model must copy into a later call is spelled
exactly like the parameter that receives it (`bash` returns `task_id`;
`await_task` takes `task_id`). Names are model-facing API — they are not
renamed casually.

The same contract covers **schema shape and validation posture**: every
model-facing input schema is a flat object of scalars (no arrays of objects —
the one trained exception is Claude Code's TodoWrite shape, which we don't
ship), and schemas validate in Zod's default strip mode — an unknown extra key
is silently dropped, never rejected. Don't `.strict()` a model-facing schema,
and don't add nested object arrays without a trained prior to ride.

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

## Schema shapes ride the same prior

The naming argument extends into shapes, and the evidence got sharper in July
2026: Ronacher's [Better Models: Worse Tools](https://lucumr.pocoo.org/2026/7/4/better-models-worse-tools/)
documents Opus 4.8 and Sonnet 5 — but not their older siblings — inventing
trailing keys inside Pi's nested `edits[]` array, with the failures clustering
right after long escaped strings, exactly where a nested array-of-objects
schema forces the model to write JSON inside a parameter. His hypothesis:
post-training inside a Claude-Code-shaped harness (flat edit schema, slop
silently repaired — aliases, unknown-key filtering, Unicode repair) leaves
alternative schemas not merely unfamiliar but implicitly punished. Fighting
that prior is futile; matching it is free correctness — the same conclusion as
naming, one level deeper.

This package was already on the right side of it: every tool schema is flat,
and the AI SDK's zod conversion gives us Claude Code's exact posture for free —
the *advertised* JSON schema carries `additionalProperties: false`, while
runtime validation is Zod strip mode, so an invented extra key is dropped
rather than bounced back as a retry. The decision is to keep both properties
on purpose. The unsettled follow-ons — misuse-rate measurement, Anthropic
`strict: true` readiness (eve currently drops the AI SDK's per-tool `strict`
flag), alias tables — live in the learning note below.

## Consequences

- **Vacating an eve built-in requires a shim.** eve injects every framework
  tool whose name the agent didn't take, so adopting `read`/`write` means
  shipping `disableTool()` shims for `read_file`/`write_file` — otherwise the
  model sees two file readers, a silent split-brain. The quick start
  prescribes the shims; the upstream ask (prior-aligned defaults, or
  config-level disable) is on the upstream-asks list.
- **SDK-specific tools keep descriptive names** (`run_async`, `check_tasks`,
  `await_task`, `webfetch`): no prior exists for them, so clarity wins over
  mimicry.
- **A batch-shaped tool must justify its shape.** A parameter that wants to be
  an array of objects should become repeated flat calls (eve runs a step's
  tool calls concurrently), a scalar list, or a string payload — unless it
  mirrors a shape the models trained on.

## Sources

- `rib/learnings/16-tool-naming-priors.md` — the survey, the rename, the
  echo-back rule, and a designed A/B misuse-rate experiment.
- `rib/learnings/35-schema-shape-priors-and-strictness.md` — the schema-shape
  half: the Ronacher evidence, the audit of where the stack stands
  (strip-mode leniency, the eve stream's invisible invalid calls, the dropped
  `strict` flag), and the measurement-first plan.
- `journal/ben/rib/2026-07-01-opencode-default-tools.md` — the per-harness
  naming table and opencode's model-conditional toolset swap.
