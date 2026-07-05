# eve proposal: surface invalid tool calls in the event stream

**Status: patch built and verified** against `vercel/eve@main` (July 2026) —
[`eve-invalid-tool-call-events.patch`](./eve-invalid-tool-call-events.patch),
a DCO-signed `git format-patch` commit, +359/−36 across 9 files (protocol
event + factory, both emission passes, client re-exports, harness tests,
changeset, docs event table). Apply with `git am` on a fork; eve's protected
branches additionally require a GitHub-verified commit signature, so the
submitter re-signs (`git commit --amend -s -S --no-edit`) with their own key.

Filed upstream as [vercel/eve#542](https://github.com/vercel/eve/issues/542)
(eve requires issue discussion before a behavior-change PR); the PR follows
on maintainer go-ahead. Tracked internally on
[zov2-code#319](https://github.com/zocomputer/zov2-code/issues/319).

Today a tool call that fails schema validation (or names a tool that doesn't
exist) is handled correctly for the *model* — the AI SDK feeds the validation
error back and the model retries — but emits **no event**: clients render
nothing where the failed call happened, and harnesses cannot measure
schema-misuse rates from session logs. One additive event type closes both
gaps.

## Why

The AI SDK's `parseToolCall` marks a call that fails input validation (or
targets an unknown tool) as `{ invalid: true, dynamic: true, error }` and
synthesizes a `tool-error` output so the model sees the failure and can
retry. eve then drops both halves on the floor:

- `emitStreamContent` (`packages/eve/src/harness/emission.ts`): the
  `tool-call` branch's `emitToolCall` returns early on `invalid === true`,
  and the `tool-error` branch only emits results for calls it previously
  emitted an action request for — which invalid calls never get.
- `emitStepActions` (`packages/eve/src/harness/step-hooks.ts`): the
  excluded-call set is seeded with `toolCalls.filter(isInvalidToolCall)`, so
  the step-result pass skips them too.
- `handleStepResult` (`packages/eve/src/harness/tool-loop.ts`) filters
  invalid calls out of runtime-action dispatch — correct, they must not
  execute — but nothing observability-shaped replaces the drop.

The measurement half matters more than the rendering half right now: newer
Anthropic models (Opus 4.8, Sonnet 5) show a documented regression emitting
off-prior tool schemas — invented trailing keys, worst inside nested arrays
of objects ([Better Models: Worse Tools](https://lucumr.pocoo.org/2026/7/4/better-models-worse-tools/)).
Whether a given harness's schemas are affected is an empirical question, and
today an eve agent cannot answer it: the durable stream — the thing session
logs, eval runners, and `"*"` hooks all consume — contains no trace of an
invalid call. A model could be retrying every third edit and the transcript
would show only elevated latency and token burn.

## What changes, precisely

### 1. A new protocol event (`packages/eve/src/protocol/message.ts`)

```ts
interface ActionInvalidEvent {
  type: "action.invalid";
  turnId: string;
  stepIndex: number;
  sequence: number;
  callId: string;
  toolName: string;
  /** Why the call was rejected before execution. */
  reason: "no-such-tool" | "invalid-input";
  /** The validation error, as the model saw it. */
  errorText: string;
  /** The raw input the model produced (parsed JSON when parseable, else the raw string). */
  input: unknown;
}
```

plus the matching `createActionInvalidEvent` factory, following the
`createActionResultEvent` shape. Additive: existing clients ignore unknown
event types.

As built, the event follows eve's stream-event convention — fields nest
under `data` (`{ data: { callId, … }, type: "action.invalid" }`) — and
`input` is `input?: JsonValue` rather than `unknown`: the factory-side
normalizer drops anything non-JSON-serializable instead of letting a
diagnostic event fail the step (`errorText` still describes the failure).
Both types re-export from `client/index.ts` alongside the other stream
events.

`reason` discriminates the two AI SDK error classes (`NoSuchToolError` vs
`InvalidToolInputError`) — the split matters downstream because they call
for different fixes (a hallucinated tool name is a naming-prior problem; a
malformed input is a schema-shape problem). Deriving it needs the error
object the SDK attaches to the invalid call (`toolCall.error`); map anything
unrecognized to `"invalid-input"`.

### 2. Emit on the streaming path (`packages/eve/src/harness/emission.ts`)

In `emitStreamContent`'s `tool-call` branch, where `emitToolCall` currently
early-returns on `invalid === true`: emit `createActionInvalidEvent` instead
of nothing, and record the callId in a new `emittedInvalidCallIds` set
(returned alongside `emittedActionCallIds`) so the step-result pass can
dedupe. The invalid call's `error` rides the chunk the AI SDK already
delivers; `errorText` via the existing `toError` helper.

As built, the shared emit helper lives in a new
`src/harness/invalid-actions.ts` (eve's structural tests cap production
files at 700 lines; `emission.ts` would have crossed it), and the invalid
branch runs *before* the `providerExecuted` branch in the stream switch —
which also closes a latent crash path where a provider-executed invalid
call's raw-string input would reach `resolveToolCallInputObject`. The event
deliberately ignores `excludedActionToolNames`: that exclusion governs how
valid calls are projected (HITL tools get `input.requested` instead), while
an invalid call has no other lifecycle event — an invalid `ask_question`
call is exactly what the measurement needs to see.

### 3. Emit on the non-streaming path (`packages/eve/src/harness/step-hooks.ts`)

`emitStepActions` receives the step result on both paths (and is the only
pass on the `generate` path). For each `toolCalls.filter(isInvalidToolCall)`
entry whose callId is not in `emittedInvalidCallIds`, emit the event. Keep
the existing exclusions exactly as they are — invalid calls still never
produce `actions.requested`, `action.result`, or runtime-action dispatch.

### 4. No behavior change for the model

The model-facing loop is untouched: the AI SDK already synthesizes the
`tool-error` feedback and the retry happens inside the same turn. This
proposal only makes the durable stream tell the truth about it.

## Semantics and edge cases

- **Dedupe across passes.** Stream-path and step-result-path both see the
  same invalid call; the shared callId set makes emission exactly-once,
  mirroring how `emittedActionCallIds` already works for valid calls.
- **Provider-executed calls.** A provider-executed dynamic call that fails
  JSON parsing is also marked invalid by the SDK; include it (same event,
  `reason: "invalid-input"`). There is no execution to suppress — the
  provider already ran it — so this is purely observational.
- **`repairToolCall`.** eve doesn't wire the AI SDK's
  `experimental_repairToolCall` today; if it ever does, a successfully
  repaired call never surfaces as invalid and correctly emits nothing. Only
  repair failures reach this event.
- **Input size.** `input` is whatever the SDK preserved (parsed value or raw
  string). A pathological call could carry a large payload; if that's a
  concern, truncate `errorText`/`input` at the factory with the same policy
  other events use — maintainers' call.

## Verification (done, at patch time)

The two claims originally read from the shipped `dist` were re-verified
against `vercel/eve` source before building: invalid calls do arrive on the
fullStream as `tool-call` chunks carrying `invalid`/`error` (the
streaming-path seam), and the non-streaming path's only emission
opportunity is `emitStepActions`.

Tests in the patch (`tool-loop.test.ts`): three existing invalid-call tests
extended to assert the exact `action.invalid` payload (`invalid-input` on
malformed JSON, including the raw-string `input` passthrough); a new
no-such-tool test asserting `reason: "no-such-tool"` via a real
`NoSuchToolError` with zero `actions.requested`/`action.result`; and a new
dedupe test where the same invalid call arrives on both the stream and the
step result and emits exactly one event. Run against the eve repo: full
unit suite green (419 files, 4381 passed / 1 pre-existing skip),
`typecheck`, `lint`, `fmt`, and `guard:invariants` all clean.

## What it unlocks downstream

- **Misuse-rate measurement.** Session logs (e.g. rib's seq-numbered event
  log) can count invalid calls per tool per model — the baseline the
  schema-shape work needs before reaching for Anthropic's `strict: true`
  (see the companion ask: eve currently drops the AI SDK's per-tool `strict`
  flag in `buildToolSet`).
- **Honest transcripts.** Clients can render the failed call and its error
  where today they show an unexplained pause.
- **Eval assertions.** "Completed the task with zero invalid calls" becomes
  a checkable property.
