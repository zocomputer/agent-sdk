# Repo conventions injection

## The decision

The workspace's conventions reach the model in two halves:

- **Root `AGENTS.md` → a system section.** The `repoConventions` instruction
  reads the workspace's root `AGENTS.md` on `session.started` and injects it
  whole, so every session starts with the repo's rules.
- **Nested `AGENTS.md` → read riders.** The first `read` under a directory
  that carries its own `AGENTS.md` attaches that file to the tool result
  (`directory_conventions`), **once per directory per session**, root
  excluded. Riders are result content, so the cached prefix stays byte-stable
  ([04](./04-prompt-cache-stability.md)). Opt out with
  `injectDirConventions: false`; rename via `conventionsFileName`.

## Why

eve ingests no repo conventions at runtime — an eve agent dropped into a repo
sees only its own `agent/instructions/*`, while every other serious harness
(Claude Code, Cursor, Codex) reads `AGENTS.md` natively. For an agent editing
real code, that gap is a correctness risk: it works without the rules that
govern the code it's changing.

The rider mechanism specifically replaced a failed prose approach. rib first
injected the root file and *told* the model to read nested `AGENTS.md` files
itself — which it did inconsistently, because remembering to read conventions
is exactly the kind of discipline models drop under load. The fix is
structural, not exhortative: conventions arrive mechanically, in the tool
result, exactly when the model first enters the directory. Once-per-directory
keeps the token cost modest; delivery is tracked per session with a property
test pinning exactly-once semantics (and `globalThis` dedupe against eve's
mid-session module-graph rebuilds).

## The inspiration

Cursor's rules-on-read behavior, observed from the inside: when its agent
reads a file, the harness appends the nested rule files relevant to that path
to the tool result — "the single best mechanism I can report from the inside,"
per the introspection note, which recommended it land in the SDK's `read`
rather than stay rib-local. It's prompt-cache-safe by the same argument that
governs everything else here: tool results append; the prefix never moves.
hostagent independently validated the shape (its `read_file` collects the
directory hierarchy's docs as breadcrumbs).

First-class `AGENTS.md` ingestion belongs upstream in eve; it's on the
README's asks list ([13](./13-work-with-the-grain-of-eve.md)). Until then,
this is the app-side bridge, and it ships in the SDK because every eve agent
working in a documented repo needs it, not just ours.

## Sources

- `rib/learnings/08-repo-context-injection.md` — the gap, the failed prose
  interim, both halves of the fix.
- `journal/ben/rib/2026-07-02-learning-from-cursor.md` §1 — the rider
  mechanism as observed in Cursor.
- `plans/ben/agent-sdk-hostagent-lessons.md` — the hostagent confirmation.
