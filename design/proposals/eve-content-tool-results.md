# eve proposal: content tool results — media in the tool result

**Status: worked design, patch not built.** This is the change that would let
`read` hand the model an image (or, with
[model-aware media support](./eve-hydrate-model-aware-media.md), a video) **in
the tool result itself**. Written to change-list precision because the two
real design forks (persistence shape, provider degrade policy) are upstream's
to own.

## Why

eve's model-facing tool result type is `ToolModelOutput = text | json`,
enforced at runtime by `normalizeToolModelOutput`
(`packages/eve/src/harness/tools.ts`), which throws on any other `type`. So a
tool that read an image cannot show it to the model. `read` therefore returns
metadata and routes inspection to the one-shot `look` oracle. That keeps the
tool contract honest, but the session model cannot see media in the turn that
called `read`, and `look` cannot preserve the session model's tools or
conversation.

The layer below is already done: the AI SDK v7 provider spec's
`LanguageModelV4ToolResultOutput` includes

```ts
| { type: "content"; value: Array<
    | { type: "text"; text: string }
    | { type: "file"; data: SharedV4FileData; mediaType: string; filename?: string }
  > }
```

and `@workflow/ai`'s DurableAgent passes it through (vercel/workflow#848 →
#1385, merged 2026-03-17). The gap is eve's normalizer plus a persistence
policy for the bytes.

## The key mechanic: eve's step loop reads tool results from history

The harness runs `ToolLoopAgent` with `stopWhen: isStepCount(1)`
(`tool-loop.ts`): one model call per harness step. Tools execute inside that
step; their results land in `result.response.messages`; `handleStepResult`
rebuilds `session.history` from those messages; **the model call that responds
to a tool result is the next harness step, reading the rebuilt history.** So
"just don't persist the bytes" is not available — a tool-result media part
must survive at least until the next model call consumes it. Any design here
is a *persistence policy*, and the storage-independent one accepts loss.

## Provider reality for tool-result media (differs from user file parts!)

Checked against the current provider converters — the tool-result path is
*safer* than the user-message path on Anthropic, and *more dangerous* on
OpenAI chat completions:

| Provider surface | user-message file part | tool-result content media part |
| --- | --- | --- |
| `@ai-sdk/google` | any media → `inlineData` | any media → `functionResponse.parts` `inlineData` (legacy pre-Gemini-3 models get top-level `inlineData` parts) |
| `@ai-sdk/anthropic` | non-image/PDF **throws** `UnsupportedFunctionalityError` | image/PDF convert to `tool_result` blocks; other media **warn + drop** (call survives) |
| `@ai-sdk/openai` (Responses) | image/audio subset | proper `input_image`/`input_file` parts |
| `@ai-sdk/openai` (Chat Completions) | wav/mp3 → `input_audio` | **`JSON.stringify(output.value)`** — base64 tokenized as text, the opencode 500–600× context blowup |

So pass-through alone is not enough: eve must degrade per provider at
model-call time, and must specifically never let a content result reach a
converter that stringifies it.

## What changes, precisely

### 1. Widen the normalizer (`src/harness/tools.ts`)

`normalizeToolModelOutput` accepts a third variant and validates its shape
(array; each item `{ type: "text", text: string }` or
`{ type: "file", data, mediaType: string }` with `data` a Uint8Array, base64
string, or data URL — the `SharedV4FileData` "data" form; URL/reference forms
rejected here, they belong to the attachment pipeline). `ToolModelOutput` in
`src/shared/tool-definition.d.ts` gains the variant. Everything else about
tool wrapping (`buildToolSet`'s `toModelOutput` adapter) is already generic
over the normalized value.

### 2. Persistence policy — the storage-independent option (recommended)

**In-process byte cache, stub-first history.** When `handleStepResult`
persists a step's `responseMessages`, any tool-result `content` media part is
**split**: the history copy stores a text stub in its place
(`[media <mediaType> from tool <name> — visible to the model this turn]`,
matching `renderSandboxRefAsTextPart`'s register), and the bytes go into a
per-session in-process cache keyed by `toolCallId` (bounded: N MiB per
session, evicted at turn end). At model-call time — the exact seam where
`hydrateSandboxAttachments` already runs — cached parts are re-inlined into
the transient hydrated copy for call-site use only.

Consequences, all deliberate:

- **Durable state never carries media bytes.** No sandbox dependency, no
  staging round trip — works identically on every backend including none.
- **The model "forgets" on any process boundary.** A worker restart mid-turn,
  a session resume on another machine, a replay, or compaction all degrade
  the part to its stub — the same graceful shape as eve's existing
  missing-attachment-bytes degrade (eve #325). The tool's result text should
  say the media can be re-read (this package's `read` note already does).
- **Same-turn visibility**, the thing removed follow-up delivery workaround can never give: the model
  sees the image on the very next step of the turn that read it.

The alternative for completeness — **persist bytes in history until turn
end, then strip** — gives cross-step durability within a turn even across
worker restarts, at the cost of media riding every step-boundary workflow
serialization during the turn. More durable, heavier, still "forgets"
long-term. The cache design is simpler and matches the accepted tradeoff.

### 3. Per-provider degrade at the hydration seam

Reuse `detectModelMediaSupport` from the
[hydration proposal](./eve-hydrate-model-aware-media.md), extended over
tool-result parts: images/PDFs re-inline for every family (Anthropic's
tool-result converter takes both), video/audio for the google family, and —
critically — **any content media part degrades to its stub for a family whose
converter stringifies content results** (OpenAI chat completions), so the
base64-blowup path is unreachable by construction.

### 4. Client/event surface: no change

`action.result` stream events already carry the tool's raw `execute()`
return; `toModelOutput` only narrows the model view. No client protocol change
is needed.

## What this package changes when it lands

- `read`/`webfetch` return media as a `content` model output instead of
  metadata only.
- The result note says the media is available to the model in the next step of
  the same turn. `look` remains useful when the session model lacks the media
  capability.

## Open questions for the maintainers

- Cache bounds and eviction (per-session cap, turn-end eviction) — and
  whether the cache should be pluggable so a world with cheap blob storage
  can opt into durability later without changing the contract.
- Whether the stub should carry a stable marker clients can detect, and
  whether a downgrade should emit an observable event (shared ask with the
  hydration proposal).
- Whether compaction needs awareness beyond treating the stub as text (it
  already summarizes `FilePart`s to the same register).
