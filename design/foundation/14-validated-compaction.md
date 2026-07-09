# Validated compaction

## The decision

Compaction summaries get audited before the conversation trusts them.
`withValidatedCompaction(model)` wraps an agent's **turn model** in a
`LanguageModelV4` facade that intercepts eve's compaction call (recognized by
eve's summarizer system prompt — the only `doGenerate` traffic on a turn
model, since turns stream), asks the same model to judge the candidate
summary against the transcript it replaces, and when the judge names dropped
facts, **repairs the summary in place** by appending a bounded
"Recovered context (compaction audit)" section before eve ever sees it. The
judge prompt is configurable (`validationSystemPrompt`), the verdicts are
observable (`onValidation` reports), and every failure mode degrades to the
unvalidated summary — validation can delay a compaction, never break one.

## Why

Compaction is the one step where the harness deletes information on the
model's behalf, with no check that what survived is what mattered.
Slipstream (arXiv:2605.08580) measured exactly this failure: unvalidated
summaries silently drop load-bearing facts — the task list, the set of files
already modified, the verification steps still pending — and the agent's
quality degrades in ways nothing surfaces. eve's `COMPACTION_SYSTEM_PROMPT`
is good, but a prompt is a request, not a guarantee; the summary is generated
by a model under a token budget and nothing downstream ever compares it to
what it replaced.

The audit closes that loop at the cheapest possible seam. The transcript
being summarized is *right there* in the compaction call's own prompt
(`formatCompactionPrompt` embeds it in one user message), so the wrapper
needs no session state, no hooks, and no second source of truth — it reads
the call, judges the reply, and rewrites the reply. Accepting one extra
model call per compaction (the user's explicit trade: a slight delay for
validated quality) buys a summary that has been checked against ground truth.

Repair-in-place, rather than veto-and-retry, keeps the contract simple:
eve always gets a summary back on the first call, the recovered facts ride
inside the summary text so they survive eve's shrink-retry and persistence
untouched, and the bounded section (`maxRecoveredChars`/`maxRecoveredFacts`)
can't blow the token budget compaction exists to protect.

## Where it's wired

- **rib and the local Builder** wrap their gateway models directly
  (`withValidatedCompaction(gateway(modelId))`).
- **Hosted/seeded agents** get it from `@zocomputer/runtime-ai`'s `/register`
  side effect: the default provider is wrapped at the provider seam
  (`withValidatedCompactionProvider`), so bare catalog slugs are covered
  without touching agent code. The facade is deliberately duplicated there
  (with a drift-pin test) because runtime-ai can't import agent-sdk.
- **The coder example** wraps its mock branch, and the `evals-compaction`
  suite forces a real compaction through a real eve server (256-token
  window) to prove the repaired summary reaches the next turn's prompt.

## The trap this dodges

eve *has* an authored `compaction.model` knob — and it silently doesn't work:
`loadSourceBackedRuntimeModelReference` resolves the authored reference back
to the turn model, so pointing a "validator model" at that seam is a no-op.
Wrapping the turn model is the seam that actually executes, and per
[13 — work with the grain of eve](./13-work-with-the-grain-of-eve.md) the bug
is filed as an upstream ask (alongside the real ask: a first-class
compaction-validation hook) rather than patched.

## The inspiration

- **Slipstream** (arXiv:2605.08580) — the paper naming the failure mode and
  the judge-against-the-original shape.
- Claude Code's compaction prompt structure (goal / accomplished / next
  steps) informs what the judge is told to look for.

## Sources

- `src/validated-compaction.ts` — the facade, judge, and repair mechanics.
- `src/mock-model.ts` — the deterministic compaction/judge answers +
  `[mock:recall]` that make the e2e eval credential-free.
- `examples/coder/evals-compaction/` — the forced-compaction eval suite.
- `packages/runtime-ai/src/validated-compaction.ts` — the duplicated
  provider-seam wrap for hosted agents.
- [`../upstream-asks.md`](../upstream-asks.md) — the `compaction.model`
  resolution bug + validation-hook asks.
