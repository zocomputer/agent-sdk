# Bounded tool output

## The decision

Every tool result has a budget, enforced at the source:

- **`read`** — a 2000-line default window, per-line clipping, a ~50 KB content
  budget, and a continuation note pointing at the next offset.
- **`bash` / `webfetch`** — head+tail capture (first and last chunks of each
  stream); on overflow the **complete** output spills to a file under
  `stateDir`, and the truncation marker names the file so the model can grep
  the spill instead of re-running the command.
- **`grep` / `glob`** — bounded result counts with explicit truncation notes;
  a grep overflow spills the complete match list to a file, same shape as
  bash.
- No cut ever splits a Unicode surrogate pair — truncation boundaries are
  nudged off high surrogates, property-tested with emoji/CJK-heavy streams.

## Why

With the prompt prefix byte-stable ([04](./04-prompt-cache-stability.md)), a
turn's cost is dominated by new tokens entering the transcript — and tool
results are the biggest uncontrolled source. Every tool result is permanent: a
100k-char `bash` output is ~25k tokens paid once at input price, then
re-attended on every later step of the session. Bounding at the source is the
only lever an eve app controls (in-history pruning needs a framework seam that
doesn't exist yet — it's on the upstream-asks list).

Three sub-decisions matter beyond the budgets themselves:

- **Head+tail, not head-only.** Head-only truncation is a quality bug, not
  just a cost one: test runners print the failure summary *last* — exactly
  the part a head-only capture drops.
- **Spill, don't discard.** A truncated result the model can't recover forces
  a re-run (or a narrower re-query it has to guess at). Writing the complete
  output to disk and naming the file turns truncation from data loss into
  pagination. Spills only happen where there's no backing file — a truncated
  `read` just points at path+offset, which is strictly better than a copy.
- **Say so.** A capped result must state it was capped, with the recovery
  move — a model can't tighten a query it doesn't know was truncated.

## The inspiration

opencode's repo-wide budget (2000 lines / 50 KB per tool result, oversized
output spilled to a tool-output dir with 7-day retention) is the direct
template — numbers rib had independently landed on before reading the source,
which we took as confirmation. hostagent (Zo v1's production agent, with a
663-line truncation module) independently validated head+tail-plus-spill and
contributed the finishing details: the grep overflow spill, and code-point-safe
slicing (its byte-aware `_limit_by_bytes()` walks codepoints for exactly the
surrogate-pair reason).

## Sources

- `rib/learnings/15-context-budget-and-pruning.md` — the cost model and the
  landed budgets.
- `plans/ben/rib-speed-opencode-lessons.md` — the opencode truncation pass.
- `plans/ben/agent-sdk-hostagent-lessons.md` — the hostagent gap analysis
  (grep spill P1-B, code-point safety P2).
