# Upstream asks — notes for the eve maintainers

Gaps we hit building this package — each is something we'd rather see
upstream than keep working around. Per the package's posture
([13-work-with-the-grain-of-eve](./foundation/13-work-with-the-grain-of-eve.md)),
every workaround lives app-side on public surfaces and names the upstream
change that would delete it; asks worked out to PR precision (some with
built, verified patches) graduate to [`proposals/`](./proposals).

- **Multimodal tool results.** `ToolModelOutput` is `text | json` only, so
  `read` can't return an image directly — we work around it by smuggling the
  bytes past on the raw result and having a hook send them back as the next
  user turn (see the guide's
  [Media reads](../GUIDE.md#media-reads-images-video-audio)), which costs
  an extra turn and an extra copy of the bytes in the durable stream.
  `@workflow/ai`'s DurableAgent already merged multimodal tool-result
  pass-through (`type: "content"`, vercel/workflow#848 → #1385); exposing that
  through eve's tool surface would let `read` return real image blocks and
  delete the whole workaround. We've worked the design to change-list
  precision — including the storage-independent persistence policy (stub-first
  history + an in-process byte cache, so the model sees media the turn it read
  them and degrades gracefully to a text stub across process boundaries) and
  the per-provider degrade table it needs (Anthropic's tool-result converter
  warn-drops non-image/PDF media; OpenAI chat completions would stringify
  base64 — the opencode blowup) — in
  [`proposals/eve-content-tool-results.md`](./proposals/eve-content-tool-results.md).
- **Attachment hydration is image/PDF-only.** The staging pipeline
  (`attachment-staging.ts`) stages every inbound file part to the sandbox, but
  `shouldInlineSandboxRefAsBytes` re-inlines only `image/*` ≤3 MiB and
  `application/pdf` ≤20 MiB at model-call time — every other media type
  (video, audio) hydrates as an `Attached file …` text stub even when the
  session's model accepts it. That silently blocks video/audio delivery on any
  sandboxed runtime (the user-turn workaround included), while the AI SDK
  underneath is ready: `@ai-sdk/google` converts any file part to `inlineData`
  and Gemini natively takes video/audio (Anthropic's converter throws
  `UnsupportedFunctionalityError` on them, so a *blind* widening would turn
  today's stub into a failed model call). The fix that threads that needle is
  model-aware hydration — detect the provider family from the already-resolved
  model (the `detectPromptCachePath` idiom) and inline video/audio ≤20 MiB for
  the google family only, keeping the text-stub fallback for everyone else. We
  built and tested exactly that patch against `vercel/eve` (all suites green):
  the PR-grade writeup is
  [`proposals/eve-hydrate-model-aware-media.md`](./proposals/eve-hydrate-model-aware-media.md)
  and the DCO-signed patch sits beside it
  (`eve-hydrate-media-support.patch`). Filed upstream as
  [vercel/eve#543](https://github.com/vercel/eve/issues/543); the PR follows
  on maintainer go-ahead. It would make `read`'s opt-in video/audio
  attachments (`attachVideoToChat`/`attachAudioToChat`) work end-to-end.
- **HITL replay.** eve persists `input.requested` but not the client's
  `input.responded`, so a replayed session reopens answered prompts as
  pending. We append synthetic responded-events from client-side storage;
  persisting the response (or accepting it into the durable stream) would fix
  every client at once.
- **`ask_question` multi-select.** The input-request contract carries rich
  options (`id`/`label`/`description`/`style`) but the response carries a
  single `optionId` — there's no way to ask "pick all that apply."
  `allowMultiple` on the request plus `optionIds` on the response would
  complete the surface; clients render checkboxes instead of buttons when
  it's set.
- **Tool naming + config-level disable.** The built-ins ship off-prior names
  (`read_file`, `write_file`), and vacating one requires a `disableTool()`
  shim file per name. Prior-aligned defaults — or a config switch to disable
  built-ins wholesale — would remove the shims.
- **No per-tool `strict` / `providerOptions` passthrough.** Anthropic's
  `strict: true` (grammar-constrained sampling — the documented fix for
  newer Claude models garbling off-prior tool schemas) is a per-tool flag
  the AI SDK already forwards to providers, but `buildToolSet` constructs
  `tool()` without it, so no eve agent can enable it. Accepting `strict`
  (and per-tool `providerOptions`) on `defineTool` and passing them through
  would make it a one-line opt-in; the change-list design is
  [`proposals/eve-strict-tool-passthrough.md`](./proposals/eve-strict-tool-passthrough.md).
  Same seam: `experimental_repairToolCall` is unwired.
- **Invalid tool calls never reach the event stream.** When a call fails
  schema validation the AI SDK marks it `invalid` and feeds the error back
  to the model, but `emitStreamContent` and `emitStepActions` both skip
  invalid calls — no event is emitted, so clients can't render the retry
  and harnesses can't measure schema-misuse rates (the regression newer
  Anthropic models show on off-prior schemas). An `action.invalid` event
  with the tool name and error class closes the gap. We built and tested
  exactly that patch against `vercel/eve` (all suites green): the PR-grade
  writeup is
  [`proposals/eve-invalid-tool-call-events.md`](./proposals/eve-invalid-tool-call-events.md)
  and the DCO-signed patch sits beside it
  (`eve-invalid-tool-call-events.patch`). Filed upstream as
  [vercel/eve#542](https://github.com/vercel/eve/issues/542); the PR follows
  on maintainer go-ahead.
- **`ask_question`'s options are the off-prior nested shape.** Its `options`
  array of `.strict()` option objects is exactly the shape newer Claude
  models garble (invented trailing keys after long strings), and it has no
  Claude Code analog to ride. Flattening it — or at least dropping
  `.strict()` so the advertised contract matches the (unvalidated) lenient
  runtime — would cut the schema-slop surface every HITL agent presents.
- **The `agent` clone tool can't be disabled.** It's injected at the harness
  layer (`createNodeHarnessTools`), not as a framework tool, so a
  `disableTool()` shim for it fails runtime agent-graph resolution — every
  session create 500s. A read-only child that should answer one question and
  return has no way to vacate recursive delegation; we fall back to
  instruction text. Either registering `agent` as a disableable framework
  tool or honoring the shim at the harness layer would close the gap.
- **Concurrent tool calls race shared resources.** The AI SDK loop runs a
  step's tool calls with `Promise.all`, so two mutating calls against the same
  file in one step race their read-modify-write sections — both report
  success and the second write silently drops the first edit. Models batch
  same-file edits because batching independent work is exactly what we teach
  them, and the lost update is invisible at the tool boundary (a live sweep
  burned ~8 steps rediscovering one through a lint error). Our `edit`/`write`
  serialize per resolved path with a `globalThis`-anchored FIFO lock
  ([`src/path-locks.ts`](../src/path-locks.ts)), but every toolset author has
  to rediscover this; a declarative "serialize calls sharing this key" seam
  on the tool contract — eve already knows the set of calls it's about to run
  concurrently — would queue same-key calls FIFO while keeping distinct keys
  parallel (zocomputer/zov2-code#337).
- **Streaming events are quadratic.** `message.appended`/`reasoning.appended`
  carry the full text-so-far alongside each delta, so one turn's events sum
  to O(n²) bytes — a 3,000-delta turn measures ~330 MB of payloads, and
  late deltas re-send ~36 KB of prefix each. Clients that store or replay
  streams must compact/thin app-side (chat-core's `stream-thinning`);
  delta-only stream events would fix storage, replay, and live-wire
  throughput at the source.
- **An aborted stream resets the client session.** `advanceSession` carries
  the session forward only when the consumed stream ends on
  `session.waiting`; an abort (Stop/Esc) therefore erases the sessionId, and
  the next `send` silently creates a fresh session — forking the
  conversation. Preserving the session state across aborts (the id was
  known!) would remove a whole class of client-side recovery code.
- **No turn cancellation.** Aborting the client stream leaves the server-side
  turn running to completion; there's no API to actually stop it. Stop
  buttons today can only detach and re-attach.
- **Continuation-token scoping.** A hook's `ctx.channel.continuationToken` is
  the runtime-namespaced form (`eve:eve:<uuid>`), but `ClientSession.send`
  needs the client-facing token (`eve:<uuid>`) — and posting the namespaced
  form doesn't error, it **silently creates a new session** (the continue
  route's get-or-create). We strip the namespace (`clientContinuationToken`)
  and assert the echoed session id; either surfacing the client token on
  `HookContext` or rejecting unknown tokens on continue would remove the trap.
- **AGENTS.md ingestion.** eve injects no repo conventions; every other
  harness (Claude Code, Cursor, Codex) reads `AGENTS.md` natively. Our
  `repoConventions` instruction covers the root file, but first-class support
  belongs in the framework.
- **In-history tool-output pruning.** Old tool results stay in the model
  prompt verbatim for a session's lifetime. We bound tool output at the source
  (spill files, result caps); a framework-level pruning/compaction hook would
  do better.
