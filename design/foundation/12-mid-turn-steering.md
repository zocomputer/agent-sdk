# Mid-turn steering

## The decision

User messages reach a **running** turn by piggybacking on tool results. With
`createStdlib({ steer: { dir } })`, the stdlib builds a per-session NDJSON
**inbox** (one file per session under `dir`) and wraps every stdlib tool so a
completing call drains the inbox and attaches the queued messages to its
result under `user_steer`, with a note telling the model to adjust course
now. UIs queue a steer by appending to the inbox
(`createSteerInbox(...).append(...)`, typically behind a small HTTP route);
`createSteerWrapper` extends delivery to an agent's own tools; and messages
that miss every tool window drain at the turn boundary via park delivery
([08](./08-park-delivery.md)) — delivered first, verbatim.

## Why

The moments you most want to redirect an agent — "stop, wrong file," "also
check the tests" — happen mid-turn, often minutes before the boundary on a
long coding turn. eve has no channel for it: hooks are observe-only for model
context, and a `send()` to a busy session is rejected. But a turn is a loop
of inference → tool calls → inference, and **every tool result re-enters the
model's context immediately** — the channel exists; it isn't labeled.
`await_task` is the highest-value delivery window: exactly when the agent
sits in background work is when you want to redirect it.

The design choices under it:

- **A file, not a route or in-process queue**, because multiple processes
  share the inbox (the agent drains; separate UI processes append). Drain is
  rename-first, so a concurrent append lands in the next drain, never lost.
- **Prompt-cache safe by construction**: delivery rides tool results, which
  append to the transcript; the cached prefix never moves
  ([04](./04-prompt-cache-stability.md)).
- **The UI side is a projection, not new state.** Delivered steers are
  already in the durable stream (inside tool outputs), so clients render the
  user's words where the model actually saw them by projecting the stream —
  no side table. The wire contract (`STEER_FIELD`, `readSteerMessages`) lives
  on a dependency-free subpath so UI packages can consume it without the
  extraction deps.

## Status

Like park delivery, this is a labeled workaround: the upstream ask is
first-class mid-turn injection — accept a user message into a running session
and deliver it at the next step boundary as a real user part — which would
replace the inbox, the wrapper, and the mirrored-constant seam in one move.
Until then the pattern is fully app-side and portable to any eve agent.

## Sources

- `rib/learnings/29-mid-turn-steering.md` — the design and the UI
  projection.
