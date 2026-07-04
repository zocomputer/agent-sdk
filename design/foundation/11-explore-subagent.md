# The explore subagent kit

## The decision

The SDK ships a complete preset for a **read-only explore subagent** — a cheap,
fast-model child the parent can fan out aggressively for codebase questions:
`createExploreTools` (read/glob/grep), `createExploreAgent` (the `defineAgent`
config with a parent-facing routing description and a consumer-picked fast
model), `createExploreInstruction` (the child's operating contract), and the
two manifest constants — `EXPLORE_TOOL_NAMES` and `EXPLORE_DISABLED_BUILTINS`
— that a consumer's test diffs its subagent `tools/` directory against. A
`subagentRoster` option on the stdlib teaches the parent when to route to it.

## Why a read-only child

A read-only child is safe to parallelize by construction: it can't clobber
sibling writes, so it's exempt from the write-scope coordination the
delegation playbook otherwise has to teach — the parent can spray five
explores at five questions without thinking. And exploration is where a
faster, cheaper model costs least: the deliverable is a report with paths and
line references, not an edit.

## Where eve's model forced the design

eve's declared subagents (`agent/subagents/<id>/`) are the right roster
mechanism — own model, own tool surface, same delegation topology and
control-plane events as the clone. But the kit's shape isn't a straight
projection of "give a child three tools"; nearly every piece exists because
of how eve's isolation boundary actually behaves.

**1. The boundary defaults open, so read-only must be constructed.** A
declared subagent inherits *nothing* from the root — and an unauthored slot
falls back to the **framework default**, not the parent's version. A child
with no `tools/` dir gets eve's built-in `bash` and `write_file`: full write
capability. So read-only must be constructed file by file — author the three
read tools *and* ship a
`disableTool()` shim for every remaining built-in. That's why
`EXPLORE_DISABLED_BUILTINS` is exported at all: the manifest exists so a
consumer test can diff the child's `tools/` dir against
toolset-names + shim-names and fail CI on drift. The test *is* the security
property; the directory layout alone guarantees nothing, and a forgotten shim
is silently resurrected write capability.

**2. Every shim has a specific reason** — the list isn't "everything but
read":

- `bash`, `write_file` — write capability, the point of the exercise.
- `read_file` — vacated in favor of the prior-aligned `read`
  ([03](./03-prior-aligned-naming.md)); without the shim the model would see
  two readers.
- `web_fetch`, `web_search` — exploration is workspace-local; excluding the
  web keeps the child's blast radius at zero.
- `ask_question` — a parked child parks the **parent's** turn. An explorer
  that hits ambiguity should report the ambiguity as its answer, and the
  instruction says so explicitly.
- `agent` — no recursive delegation from a one-question child.
- `todo`, `load_skill` — surface noise for a single-question worker, and
  shimming them keeps the instruction's "your tools are `read`, `glob`, and
  `grep`" literally true instead of approximately true.

**3. Instructions don't inherit either — the child would work blind.** The
kit ships `createExploreInstruction` because without it the child has *no*
operating contract at all, and the contract carries load the parent can't:
the final message is the entire deliverable (the parent sees nothing else the
child did), cite paths and line refs, honor the requested thoroughness
(quick / medium / very thorough), never guess silently. The child also needs
its own `repoConventions` re-export, or it explores a documented repo without
its rules.

**4. Hooks don't inherit — one is re-exported, one is deliberately absent.**
A consumer whose parent logs sessions via a hook must re-export it under the
subagent, or child sessions vanish from its records (no lineage, nothing to
inspect). The park-delivery hook ([08](./08-park-delivery.md)) is
deliberately *not* wired: a read-only child has no task machinery and no
client to re-inject image bytes. That absence propagates into how the read
tool is built — `createExploreTools` constructs `read` with
`attachImagesToChat: false` and **rewritten failure hints**, because the
stdlib defaults suggest `bash` extraction, editing, and asking the user, all
of which are lies here. The honest versions match the child's contract:
"report the path and size so the caller can extract what's needed."

**5. Routing rides two prompt surfaces, because that's all eve offers.** eve
gives the parent exactly one built-in signal about a declared subagent: its
required `description`. So `buildExploreDescription` is written *for the
parent* — read-only, parallel-safe, "pack the message with everything it
needs (it sees none of your history)," "state the thoroughness you want" —
and the delegation playbook's roster section
(`subagentRoster: [{ name, when }]`) adds the when-to-choose-it guidance the
description alone can't carry. Both interpolate once at build time
([04](./04-prompt-cache-stability.md)).

One non-inheritance turned out *not* to bite: eve's sandbox. The stdlib tools
resolve against `workspaceRoot` on the host filesystem, so the child reads
the same real working tree as the parent with no extra wiring.

The upstream ask follows directly: a framework-enforced `readOnly` (or
tool-allowlist) flag on declared subagents would let eve enforce what the
manifest test currently enforces socially
([13](./13-work-with-the-grain-of-eve.md)). The fallback-open default is the
sharpest edge in eve's subagent surface.

## The inspiration

Cursor's typed subagent roster, observed from the inside: named presets with
different tool surfaces rather than only a clone-of-self, with `explore`
(fast, read-only, "specify the thoroughness you want") singled out in the
introspection note as the one to copy first. The clone topology groundwork —
parent stream as control plane, attach to the child session for the
transcript — came from rib's own subagent work and ships as the delegation
playbook instruction.

## Sources

- `rib/learnings/28-declared-subagent-isolation.md` — the fallback-open trap,
  non-inheritance, and the manifest test.
- `plans/ben/rib-explore-subagent.md` — the kit design and the open
  decisions (webfetch out, `ask_question` disabled, model pinned).
- `rib/learnings/23-subagent-stream-topology.md` — the delegation topology.
- `journal/ben/rib/2026-07-02-learning-from-cursor.md` §7 — the roster.
