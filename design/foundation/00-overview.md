# Foundation: why the SDK is shaped this way

`@zocomputer/agent-sdk` was not designed on a whiteboard. It was extracted from
**rib**, the coding agent that works on the Zo monorepo itself — and rib was
built against a reading list. Before each layer, we studied the best existing
codebase for that layer, wrote the learnings down, and let the notes drive the
implementation. This directory is the settled record of the decisions that
survived that process: one doc per foundational decision, what it is, why we
made it, and where it came from.

## The method

Study → write → build. Each comparable was read deliberately (source clones,
or in one case the harness introspecting itself), the findings were written
into the monorepo as learning notes, and the notes — not memory — drove the
PRs. Where two independent projects converged on the same answer, we treated
it as discovered truth; where they split, it was a decision we still got to
make.

## The inspiration roster

- **Claude Code** — the tool surface models know best. Its names, params, and
  numeric limits are the ecosystem's de-facto standard; we adopted them
  ([03](./03-prior-aligned-naming.md)).
- **opencode** — the closest structural comp (a Bun/TypeScript agent harness
  with the lowercase Claude Code toolset). Its default-toolset survey drove
  our naming and its truncate-with-spill design drove our output bounding
  ([05](./05-bounded-tool-output.md)); its broken PDF-as-attachment path is
  the cautionary tale behind extraction-based reads
  ([06](./06-rich-reads-one-tool.md)).
- **openclaw** — the strongest naming datapoint: it renames its whole toolset
  to Claude Code's exact names when talking to Anthropic models, purely for
  prior alignment.
- **hermes** — "prompt caching is sacred." Its cache-as-architecture stance,
  independently mirrored by openclaw, became our prefix-stability rule
  ([04](./04-prompt-cache-stability.md)).
- **pi** — the malleable-harness study: how a harness stays reshapeable by its
  consumer, reflected in the à la carte factory surface
  ([01](./01-extracted-from-a-working-agent.md)).
- **Cursor** — read from the inside: the Cursor agent introspected its own
  system prompt and toolset for us. Its rules-on-read riders
  ([10](./10-repo-conventions-injection.md)), instruction prose
  ([09](./09-instruction-stack.md)), output watchers
  ([07](./07-background-tasks.md)), and typed subagent roster
  ([11](./11-task-subagents.md)) all shipped here within days.
- **hostagent** — Zo v1's production agent, our ancestor rather than a
  neighbor: Python, ~120 tools, years of edge-case scar tissue. Half its value
  was independent confirmation of patterns we'd already landed; the other half
  was a punch list (webfetch main-content extraction, grep overflow spill,
  code-point-safe truncation) that shipped within hours
  ([05](./05-bounded-tool-output.md), [06](./06-rich-reads-one-tool.md)).

## The decisions

- [01 — Extracted from a working agent](./01-extracted-from-a-working-agent.md):
  ship what rib proved, as `createStdlib` plus à la carte factories, wired by
  re-export.
- [02 — Standalone by construction](./02-standalone-by-construction.md): zero
  house imports, raw TypeScript, peers not bundles, and the `file:` boundary
  that keeps the package honest.
- [03 — Prior-aligned naming](./03-prior-aligned-naming.md): the model's
  trained tool surface is a contract; match it.
- [04 — Prompt-cache stability](./04-prompt-cache-stability.md): the prompt
  prefix is write-once per session; live state rides tool results.
- [05 — Bounded tool output](./05-bounded-tool-output.md): every tool result
  has a budget; overflow spills to disk, recoverably, never mid-code-point.
- [06 — Rich reads through one tool](./06-rich-reads-one-tool.md): PDFs, DOCX,
  and spreadsheets are text extraction through the existing `read` window —
  the winning interface is no new interface.
- [07 — Background tasks](./07-background-tasks.md): adaptive backgrounding,
  a persisted task registry, and `notify` watchers instead of polling.
- [08 — Park delivery](./08-park-delivery.md): the
  queue-and-send-as-next-user-turn channel for anything that must reach a
  parked session.
- [09 — The instruction stack](./09-instruction-stack.md): ship the
  operational prose with the tools; persona stays consumer-owned.
- [10 — Repo conventions injection](./10-repo-conventions-injection.md): root
  `AGENTS.md` at session start, nested `AGENTS.md` as read riders.
- [11 — The model-tier task subagent kit](./11-task-subagents.md): full parent
  parity by construction, model choice = tool choice, pinned by a manifest
  test, routed by a roster.
- [12 — Mid-turn steering](./12-mid-turn-steering.md): user messages delivered
  into a running turn over tool results.
- [13 — Work with the grain of eve](./13-work-with-the-grain-of-eve.md): build
  workarounds app-side, document every gap as an upstream ask.

## Relation to the other docs

- The package `README.md` (install + quick start) and `GUIDE.md` (each
  subsystem in depth) are the **how**. These docs are the **why** — including
  [`../upstream-asks.md`](../upstream-asks.md), the maintained list of eve
  gaps the package works around.
- `rib/learnings/` (in the parent monorepo) is the live design log — the
  running notes that motivated each extraction and track what to extract
  next. This directory is the curated, stable subset: the decisions that
  define the package. When a foundational decision changes, update it here;
  when a new pattern is still being proven in rib, it stays there.

Internal sources are cited as backticked monorepo paths (`rib/learnings/…`,
`plans/ben/…`, `journal/ben/…`); they live in the private `zocomputer/zov2-code`
repo, not this mirror.
