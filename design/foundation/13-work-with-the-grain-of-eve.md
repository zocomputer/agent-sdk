# Work with the grain of eve

## The decision

The SDK builds on eve as it is, never forks or patches it, and treats every
gap the same way: build the workaround **app-side and portable**, then
document the gap as a concrete upstream ask in
[`../upstream-asks.md`](../upstream-asks.md). Each workaround is written with
its own expiry in mind — the upstream change that would delete it is named in
the ask.

## Why

eve's core bets are right for this package's consumers: durable sessions, a
replayable stream, filename-as-wire-name tool loading, observe-only hooks,
serious prompt-cache plumbing. An SDK that fought those bets — monkey-patching
the harness, private APIs, a forked runtime — would break on every eve release
and teach its consumers nothing transferable. Constraints also breed better
designs than escape hatches: park delivery's "act like a user"
([08](./08-park-delivery.md)) fell out of accepting that hooks can't inject
context, and it came back durable, replayable, and rendered by every client
for free — properties a privileged side channel wouldn't have had.

The posture has three rules:

- **Workarounds live at the app layer**, on public surfaces (`eve/client`
  over loopback, tool results, dynamic instructions), so they port to any eve
  project and survive upgrades.
- **Every gap becomes a written ask**, specific enough to act on — the
  asks list names the type to widen, the event to emit, the flag to add,
  often with the upstream PR that already did the groundwork.
- **When upstream ships, the workaround is deleted**, not kept as a fallback
  (the monorepo's no-compatibility-shims rule, applied outward).

## The current asks, and what each would delete

- **Multimodal tool results** → deletes park delivery's image leg.
- **HITL response persistence** → deletes every client's replay side-channel.
- **`ask_question` multi-select** → completes the HITL surface the playbook
  teaches.
- **Prior-aligned default tool names / config-level disable** → deletes the
  `read_file`/`write_file` shim files.
- **Continuation-token scoping** → removes a silent
  new-session-instead-of-error trap.
- **`AGENTS.md` ingestion** → deletes the `repoConventions` instruction.
- **In-history tool-output pruning** → complements source-side bounding,
  which composes with it but can't substitute for it.

(The live list is [`../upstream-asks.md`](../upstream-asks.md); this snapshot
shows the pattern.)

## The inspiration

This is the monorepo's working method turned outward. The same week this
package was built, the repo's other layers were built by studying prior art
and writing the learnings down before coding — and the SDK applies that
posture to its own dependency: understand exactly what eve does (the notes
cite eve's dist sources line-by-line), verify before assuming (eve already
ran tool calls concurrently; a planned workaround died on that finding), and
feed what's learned back upstream instead of hoarding patches.

## Sources

- [`../upstream-asks.md`](../upstream-asks.md) — the maintained asks list.
- `rib/learnings/00-overview.md` — the design log this posture runs on.
- `journal/ben/2026-07-03-week-one-in-review.md` — the study-then-build
  method.
