# eve proposal: hydrate video/audio attachments inline for models that accept them

**Status: patch built and verified** against `vercel/eve@main` (July 2026) —
[`eve-hydrate-media-support.patch`](./eve-hydrate-media-support.patch), a
DCO-signed `git format-patch` commit, +279/−17 across 4 files. Apply with
`git am` on a fork; eve's protected branches additionally require a
GitHub-verified commit signature, so the submitter re-signs
(`git commit --amend -s -S --no-edit`) with their own key.

Upstream target: `packages/eve/src/harness/attachment-staging.ts` and its
callers. Tracked on the README's
[Notes for the eve maintainers](../../README.md#notes-for-the-eve-maintainers).

Filed upstream as [vercel/eve#543](https://github.com/vercel/eve/issues/543)
(eve requires issue discussion before a behavior-change PR); the PR follows
on maintainer go-ahead. Tracked internally on
[zov2-code#292](https://github.com/zocomputer/zov2-code/issues/292). At
filing time the patch was re-verified: it still applies cleanly on current
`main`, and the converter claims were re-checked in the dists of the
versions eve actually pins (`@ai-sdk/google` 4.0.0, `@ai-sdk/anthropic`
4.0.0 — the Anthropic converter also accepts `text/plain` documents, so the
precise statement is that it throws on video/audio, which is what matters
here).

## Why

eve stages every inbound `FilePart` to the framework sandbox
(`stageAttachmentsToSandbox`) and re-inlines bytes at model-call time through
`shouldInlineSandboxRefAsBytes`, a hard two-case whitelist:

```ts
function shouldInlineSandboxRefAsBytes(ref: SandboxRef): boolean {
  if (ref.mediaType.startsWith(IMAGE_MEDIA_TYPE_PREFIX)) {
    return ref.size <= HYDRATE_IMAGE_INLINE_MAX_BYTES;   // 3 MiB
  }
  if (ref.mediaType === PDF_MEDIA_TYPE) {
    return ref.size <= HYDRATE_PDF_INLINE_MAX_BYTES;     // 20 MiB
  }
  return false;
}
```

Everything else — every video, every audio file — hydrates as an
`Attached file <path> (<mediaType>)` text stub. **Silently**: the send
succeeds, the turn runs, no error and no stream event mark the downgrade. A
user who attaches a screen recording to a Gemini session — a model that
natively understands video — gets a model that can only see the file's path.

The whitelist's conservatism is justified where it guards: a blind widening
would regress Anthropic sessions, because `@ai-sdk/anthropic`'s converter
`throw`s `UnsupportedFunctionalityError` on non-image/PDF media — today's
harmless stub would become a failed model call. But the AI SDK is otherwise
ready: `ai` passes any `mediaType` through `FilePart`s untouched, and
`@ai-sdk/google` converts **any** file part to `inlineData` with no
media-type whitelist (checked against `@ai-sdk/google` 4.0.8 /
`@ai-sdk/anthropic` 4.0.8 / `@ai-sdk/openai` 4.0.7). The provider spec
exposes no inline-media capability introspection (`supportedUrls` covers URL
passthrough only), so the missing piece is a small, honest per-family rule in
eve — the same shape as eve's existing `detectPromptCachePath`, which already
keys harness behavior on the resolved model.

## What changes, precisely

### 1. `src/harness/attachment-staging.ts` (+121/−12)

**New constant** beside the existing image/PDF caps:

```ts
/**
 * Upper bound, in bytes, on video/audio payloads that hydrate as inline
 * bytes for models that accept them natively. Matches the Gemini API's
 * inline-data request budget.
 */
const HYDRATE_MEDIA_INLINE_MAX_BYTES = 20 * 1024 * 1024;

const VIDEO_MEDIA_TYPE_PREFIX = "video/";
const AUDIO_MEDIA_TYPE_PREFIX = "audio/";
```

**New exported type + detector** (exported for unit tests, mirrors
`detectPromptCachePath`'s "runs once per harness step on the already-resolved
model" contract):

```ts
export interface ModelMediaSupport {
  /** `video/*` file parts hydrate as inline bytes. */
  readonly video: boolean;
  /** `audio/*` file parts hydrate as inline bytes. */
  readonly audio: boolean;
}

export function detectModelMediaSupport(model: LanguageModel | undefined): ModelMediaSupport;
```

`detectModelMediaSupport` classifies the model into a provider family via a
private `providerFamilyForModel`:

- **string model** (a gateway id like `"google/gemini-3-pro"`): the creator
  segment before the `/`, lowercased. A bare id with no slash carries no
  family signal → `""`.
- **gateway instance** (`provider` top-level segment `"gateway"`): the family
  comes from `modelId`'s creator segment, same rule as the string form.
- **direct provider instance**: the top-level `provider` segment
  (`"google.generative-ai"` → `"google"`, `"anthropic.messages"` →
  `"anthropic"`), the same dotted-provider split `classifyModelRouting`
  already uses.
- malformed shapes (no string `provider`/`modelId`) → `""`.

The family map is deliberately one entry:

- `"google"` → `{ video: true, audio: true }`. The `@ai-sdk/google` converter
  turns any file part into `inlineData`, and every Gemini language model
  natively understands video and audio (this covers `@ai-sdk/google`,
  `@ai-sdk/google-vertex` — top-level segment `google` — and google-targeted
  gateway models).
- everything else → `{ video: false, audio: false }`. **OpenAI is deliberately
  excluded**: its Chat Completions converter does map `audio/wav` and
  `audio/mp3`/`audio/mpeg` to `input_audio` parts, but only the
  audio-preview/realtime model subset accepts those, so a family-level rule
  would fail calls on mainline `openai/*` models. **Anthropic stays excluded**
  because its converter throws on any non-image/PDF media part.

**Signature changes**, default-preserving:

```ts
export async function hydrateSandboxAttachments(
  messages: readonly ModelMessage[],
  model?: LanguageModel,            // NEW — optional; omitted = today's behavior
): Promise<ModelMessage[]>
```

`hydrateSandboxAttachments` computes `detectModelMediaSupport(model)` once
and threads it through `hydrateMessageContent(content, sandbox, mediaSupport)`
into the widened predicate:

```ts
function shouldInlineSandboxRefAsBytes(ref: SandboxRef, mediaSupport: ModelMediaSupport): boolean {
  if (ref.mediaType.startsWith(IMAGE_MEDIA_TYPE_PREFIX)) {
    return ref.size <= HYDRATE_IMAGE_INLINE_MAX_BYTES;
  }
  if (ref.mediaType === PDF_MEDIA_TYPE) {
    return ref.size <= HYDRATE_PDF_INLINE_MAX_BYTES;
  }
  if (ref.mediaType.startsWith(VIDEO_MEDIA_TYPE_PREFIX)) {
    return mediaSupport.video && ref.size <= HYDRATE_MEDIA_INLINE_MAX_BYTES;
  }
  if (ref.mediaType.startsWith(AUDIO_MEDIA_TYPE_PREFIX)) {
    return mediaSupport.audio && ref.size <= HYDRATE_MEDIA_INLINE_MAX_BYTES;
  }
  return false;
}
```

The function's "keep this decision narrow" doc comment is updated to state
the new rule: images/PDFs qualify unconditionally; video/audio qualify only
when the resolved model accepts them (a part a provider's converter rejects
would fail the whole model call); everything else still stubs. All other
behavior — staging, the missing-bytes degrade path (eve #325), the
`renderSandboxRefAsTextPart` stub shape — is untouched.

### 2. `src/harness/tool-loop.ts` (+4/−2)

One call-site change. The tool loop resolves the model two statements above
hydration, so the resolved value is already in scope:

```ts
-    const hydratedMessages = await hydrateSandboxAttachments(messages);
+    // … The resolved model widens the inline decision to video/audio where
+    // the provider accepts them (see `detectModelMediaSupport`).
+    const hydratedMessages = await hydrateSandboxAttachments(messages, model);
```

### 3. `src/harness/attachment-staging.test.ts` (+58/−2, unit)

A new `describe("detectModelMediaSupport")` covering every classification
branch: `undefined` and bare-id strings → none; gateway id strings
(`google/…` → all, `anthropic/…`/`openai/…` → none); direct instances
(`google.generative-ai`, `google.vertex.chat` → all; `anthropic.messages` →
none); gateway instances resolved through `modelId`'s creator segment; and
malformed shapes (`{}`, `{ provider: "gateway" }`) → none.

### 4. `src/harness/attachment-staging.integration.test.ts` (+111, integration)

Four new cases on the real stage-then-hydrate round trip (mock sandbox):

- **video stubs by default** — no `model` argument → the exact
  `Attached file <path> (video/mp4)` text part, byte-for-byte today's shape.
- **video inlines for the google family** — `hydrateSandboxAttachments(messages,
  "google/gemini-3-pro")` → the hydrated file part carries the original bytes
  (buffer equality) and `mediaType: "video/mp4"`.
- **oversized video (> 20 MiB) stubs even for a capable model** — the size cap
  holds independently of the family rule.
- **audio inlines for google, stubs for anthropic** — the same staged
  `audio/wav` part hydrated twice: bytes under `"google/gemini-3-pro"`, text
  stub under `"anthropic/claude-sonnet-4.5"`.

## Semantics and compatibility

- **No behavior change without the new argument.** `model` is optional and
  every existing caller and test passes it nowhere; `detectModelMediaSupport(undefined)`
  is the no-extended-media constant. Only the one production call site opts in.
- **Session history is untouched.** Hydration output was already transient
  (never written back to `session.history`, which stays ref-only); media bytes
  ride one model call and are re-read from the staged sandbox file each step.
- **Failure modes strictly improve.** No family ever inlines a part its
  provider converter would reject; families outside the map keep the text
  stub. The one new risk surface is a gateway-routed google model whose
  gateway lacks video passthrough — that would surface as a gateway error and
  is the gateway's contract to honor, same as image parts today.

## Verification (run on the patched tree)

- `pnpm --filter eve run test:unit` — 4384 passed, 1 skipped (419 files).
- `pnpm --filter eve run test:integration` — 388 passed (50 files).
- `pnpm guard:invariants`, `pnpm lint`, `pnpm typecheck`, `pnpm fmt` — clean.

## Open questions for the maintainers

- Whether to fold this into a general per-model capability table (context
  windows already flow from the gateway catalog; media modalities could too,
  making the hard-coded family map a fallback rather than the source).
- Whether hydration downgrades should emit an observable signal (log or
  stream event) — today a stubbed part is invisible to clients, which is how
  the silent-video gap went unnoticed. That ask stands independently of this
  patch (see the [README note](../../README.md#notes-for-the-eve-maintainers)).
