# Upstream asks — notes for the eve maintainers

Gaps we hit building this package — each is something we'd rather see
upstream than keep working around. Per the package's posture
([13-work-with-the-grain-of-eve](./foundation/13-work-with-the-grain-of-eve.md)),
every workaround lives app-side on public surfaces and names the upstream
change that would delete it; asks worked out to PR precision (some with
built, verified patches) graduate to [`proposals/`](./proposals).

Last verified against `vercel/eve` main on 2026-07-10; issue and PR states
below are current to that date.

**Start here — filed and ready for a maintainer decision:**

- [vercel/eve#543](https://github.com/vercel/eve/issues/543) — model-aware
  video/audio hydration. Tested DCO-signed patch in
  [`proposals/`](./proposals); PR on go-ahead.
- [vercel/eve#542](https://github.com/vercel/eve/issues/542) — `action.invalid`
  stream events. Tested DCO-signed patch in [`proposals/`](./proposals);
  implementation open as [#665](https://github.com/vercel/eve/pull/665).
- [vercel/eve#593](https://github.com/vercel/eve/issues/593) — public
  client-side tools. Implementation open as
  [#664](https://github.com/vercel/eve/pull/664).

The remaining framework asks are tiered by the workaround burden we carry today:
**Priority** asks each sustain a bespoke app-side layer (state machines, model
facades, reads of eve internals, recovery code) that the upstream change would
delete outright; **Next** asks cover reliability and observability gaps whose
workarounds are bounded; **Later** asks are schema and ergonomics improvements
that don't drive real machinery.

## Priority — delete active workaround layers

### Media

- **Multimodal tool results.** `ToolModelOutput` is `text | json` only, so
  `read` can't return an image directly. It returns metadata and routes
  inspection through the one-shot `look` oracle (see the guide's
  [Media reads](../GUIDE.md#media-reads-images-video-audio)).
  `@workflow/ai`'s DurableAgent already merged multimodal tool-result
  pass-through (`type: "content"`, vercel/workflow#848 → #1385); exposing that
  through eve's tool surface would let `read` return real image blocks to the
  session model. We've worked the design to change-list
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
  sandboxed runtime, while the AI SDK
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
  (`eve-hydrate-media-support.patch`). Filed by 0thernet as open
  [vercel/eve#543](https://github.com/vercel/eve/issues/543); the PR follows
  on maintainer go-ahead. It is required for video/audio user and future
  tool-result file parts to reach capable models end to end.
- **Subagents can't receive media or an explicit model choice.** A subagent
  tool's input is fixed at `{ message, outputSchema? }` — text only, no file
  parts — so "hand this video to a model that can see it" can't be a subagent
  call: the child can't be given the bytes. eve now supports lifecycle-scoped dynamic model
  selection (`defineDynamic` on the agent's `model`, vercel/eve#581), but the
  parent still can't select an allowed model in the individual subagent call.
  Our workaround is the `look` media oracle (see the guide's
  [Media oracle](../GUIDE.md#the-media-oracle-look)): a plain tool that
  reads the bytes and makes its own one-shot `generateText` with a file
  part, sidestepping eve's media path entirely. The full form — a media
  subagent that carries tools and conversation — needs file parts in the
  subagent input contract plus the hydration widening above; a per-call
  `model` field validated against an allowlist would also collapse the
  tool-per-tier encoding (`task_fast`/`task_deep`) into one subagent.

### Session control

- **Public client-side tools.** Only the framework-owned `ask_question` can
  omit `execute`, turn a call into `input.requested`, and park durably for a
  purpose-built client response. Authored tools must execute, and the
  extraction path is hard-coded to the `ask_question` name. Our
  `request_state_consent` workaround rides tool approval, which gives it a
  durable park but forces approval-shaped semantics and UI. A public
  `defineClientTool` plus a runtime resolver-registration seam would let
  products add mandatory, typed client tools without forking eve. Filed by
  dcosson as open
  [vercel/eve#593](https://github.com/vercel/eve/issues/593); the public
  client-tool half is implemented in open
  [vercel/eve#664](https://github.com/vercel/eve/pull/664) (currently
  conflicting with main), while the protected resolver-registration half
  remains unconfirmed.
- **Deliver-on-park API.** Background work can finish after the model's last
  tool window, but eve has no first-class "deliver this to the session when it
  next parks" operation. We removed the SDK's loopback follow-up workaround:
  it depended on topology-specific self-delivery and made background tools
  promise notifications that hosted agents could not deliver. A framework
  operation keyed by session id would make this capability portable enough to
  support directly.

### Correctness and scale

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
  late deltas re-send ~36 KB of prefix each. vercel/eve#691 now coalesces
  adjacent appends while durable writes are in flight, which fixes server
  throughput under a slow writer, but every emitted event still carries its
  cumulative `*SoFar` field. Clients that store or replay streams must
  compact/thin app-side (chat-core's `stream-thinning`); delta-only stream
  events would fix storage, replay, and live-wire throughput at the source.
- **An aborted stream resets the client session.** `advanceSession` carries
  the session forward only when the consumed stream ends on
  `session.waiting`; an abort (Stop/Esc) therefore erases the sessionId, and
  the next `send` silently creates a fresh session — forking the
  conversation. Preserving the session state across aborts (the id was
  known!) would remove a whole class of client-side recovery code.
- **No first-class mid-turn user-message injection.** We removed the SDK's
  tool-result steering side channel and parked-turn fallback because they were
  local-agent workarounds with inconsistent hosted semantics. eve owns the
  running turn and its step boundaries; a public "append this user message at
  the next step" operation remains the right shape for portable steering.
- **A worker death mid-turn writes no terminal event.** A structural reload
  (env-file change, dep change) or crash kills every in-flight step, and the
  durable stream just ends mid-turn — no `turn.failed`, so the last assistant
  message's metadata reads `streaming` forever and every status projection
  downstream shows a busy chat that will never settle. opencode makes this
  state unrepresentable: its session processor finalizes parts on every turn
  exit (`Effect.ensuring(cleanup())` flips orphaned tool calls to an
  interrupted error state), and its busy status is in-memory-only, so a
  process restart reads idle by construction. Our workaround is a whole heal
  layer — an app-side orphan verdict written after the startup reconcile
  (`isOrphanedTurn`/`workerEpochMs` in this package; rib's `ruled_dead_at`)
  plus a read-time part settlement in chat-core (`settleInterruptedTurn`).
  Emitting `turn.failed` (with a worker-death reason) when a reload/crash
  orphans a turn — or re-driving the in-flight turn from the durable stream
  on worker start, as redeploys are documented to — would delete all of it.

### Context and platform internals

- **In-history tool-output pruning — tool-pair summarization.** Old tool
  results stay in the model prompt verbatim until full compaction rewrites
  the history. We bound tool output at the source (spill files, result caps),
  but the best-worked field version of the missing layer is goose's
  **incremental tool-pair summarization**
  (`crates/goose/src/context_mgmt/mod.rs`, commit
  `e6be2e9`): a background fast-model pass replaces tool request/response
  pairs older than a cutoff with one compact agent-only summary message
  each — batch of 10 pairs per pass, cutoff scaled to the context limit
  (`(3 · limit / 20_000).clamp(10, 500)`) and always excluding the current
  turn's trailing calls, spawned off the hot path at turn start. The
  transcript decays gradually instead of being rewritten at the compaction
  cliff, and it composes with prompt caching (each pair is rewritten exactly
  once, behind the cache prefix). The eve shape: a harness pass over
  `history` before the model call, gated by a config knob, using the
  compaction model. Independent of (and complementary to) full compaction.
- **No compaction-validation hook.** Compaction is the one step where the
  harness deletes information on the model's behalf, and nothing downstream
  compares the summary to what it replaced — Slipstream (arXiv:2605.08580)
  measures the resulting silent quality loss. Our workaround intercepts the
  compaction call at the model seam (a `LanguageModelV4` facade recognizing
  the compaction system prompt), judges the summary against the transcript
  embedded in the call's own prompt, and repairs it in place. It works when
  the wrapped model is the configured compaction model, but rides two
  incidental facts: the prompt is recognizable and the transcript travels
  inside it. A first-class seam —
  `compaction.validate?: (transcript, summary) => summary` or an
  `onCompaction` variant that can amend the summary before it persists —
  would delete the sentinel sniffing and survive prompt refactors.
- **Sandbox backends can't see subagent lineage.** `SandboxBackendCreateInput.tags`
  carries `{ agent, channel, sessionId }` but no root session id, so a custom
  backend that partitions sandboxes per session provisions a fresh, empty
  sandbox for every subagent child instead of sharing the root session's — eve
  itself wants sharing (the built-in `agent` clone propagates
  `sandboxSessionId` + `parentSandboxState`), but declared subagents get no
  propagation and `tags.sessionId` is always the child's own id. Our
  workaround reads `ParentSessionKey` from eve's process-wide context storage
  (`Symbol.for("eve.context-storage")`) with no eve import
  (`@zocomputer/agent-sandbox`'s `ambient.ts`, pinned against the installed
  dist) and keys the broker on `rootSessionId` when present. The runtime AI
  fetch wrapper now needs the same ambient read to attribute child model calls
  to the root conversation for billing. Surfacing `rootSessionId` in sandbox
  `tags`, plus public parent/root lineage on runtime callback context — the
  providers already have `ParentSessionKey` in reach — would let both
  integrations stop reading eve's internals. See
  [subagent-shared-sandboxes.md](https://github.com/zocomputer/zov2-code/blob/main/plans/ben/subagent-shared-sandboxes.md).

### AI Gateway

These questions cross eve, the AI SDK Gateway provider, and the hosted AI
Gateway service. We need every model call to pass through our authenticated
metering proxy without giving up eve's gateway-specific behavior, and we need
enough evidence from each call to bill the owning organization correctly.

#### Is our host-selected Gateway transport supported?

- **What we do.** Agents keep a bare `creator/model` slug, but an early import
  installs a proxy-pointed `createGateway` on the AI SDK's
  `globalThis.AI_SDK_DEFAULT_PROVIDER` slot. The provider supplies our proxy
  `baseURL`, runtime-auth headers, and a `fetch` wrapper that stamps the eve
  session and turn. See
  [`runtime-ai/register.ts`](../../runtime-ai/src/register.ts) and
  [`runtime-ai/gateway.ts`](../../runtime-ai/src/gateway.ts).
- **Why.** A bare slug makes eve classify the model as gateway-routed, preserving
  automatic caching, provider-executed web search, and catalog-based context
  windows. Passing a custom Gateway model instance instead loses those behaviors
  in eve today because several decisions branch on a string model or the resolved
  provider name.
- **Ask.** Is replacing `AI_SDK_DEFAULT_PROVIDER` an intended host integration,
  or is there a supported eve-level seam for the Gateway provider, `baseURL`,
  default headers, and `fetch`? If the global slot is the intended seam, can eve
  document and test that a host-selected provider retains bare-slug semantics?

#### Is there a supported model-call accounting surface?

- **What we do.** The proxy transparently forwards the AI SDK Gateway protocol,
  tees each response, and parses `providerMetadata.gateway` for the generation
  id, serving provider, credential type, fallback attempts, and the market/base/
  surcharge/total cost fields. This parser is the billing input; see
  [`gateway-usage.ts`](../../../apps/api/src/lib/gateway-usage.ts).
- **Why.** Eve receives the full AI SDK step result, but `step.completed` keeps
  only input, output, cache-read, and cache-write token counts. The Gateway
  generation id and provider metadata are discarded before an eve host can
  observe them.
- **Ask.** Is it safe to depend on the current Gateway response metadata, or can
  eve expose a server-side `onModelCallComplete`-style hook with the session,
  turn, step, model, full usage, response/generation id, and provider metadata?
  A server-side hook would avoid putting raw provider details into the durable
  client stream while giving hosts a supported metering boundary.

#### Does `/v4/ai` have a stable wire and cost contract?

The public [AI SDK Gateway provider documentation](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway#provider-instance)
documents `createGateway({ baseURL, headers, fetch })` but currently names
`https://ai-gateway.vercel.sh/v3/ai` as the default prefix. The
`@ai-sdk/gateway@4.0.7` source and bundled docs installed with eve instead use
`https://ai-gateway.vercel.sh/v4/ai`. We found no public specification for the
`/v4/ai/language-model` request/stream protocol or for the inline camel-case
`providerMetadata.gateway` fields. Vercel's
[Custom Reporting docs](https://vercel.com/docs/ai-gateway/observability-and-spend/custom-reporting#response-fields)
define related snake-case aggregate fields, but not this per-generation wire.

That ambiguity became a billing bug, not just a documentation concern. A live
Anthropic Sonnet 4.6 call served through Bedrock BYOK reported all the raw token
classes correctly:

- 7,638 prompt tokens: 3 uncached + 7,635 cache-write
- 14 output tokens
- catalog prices: `$0.000003` input, `$0.00000375` cache-write,
  `$0.000015` output

`providerMetadata.gateway.marketCost` nevertheless reported `$0.000219`, the
price of only the three uncached input and fourteen output tokens. The complete
list-price calculation is `$0.02885025`; the `$0.02863125` gap is exactly
`7,635 × $0.00000375`. A second live call reported 9,642 cache-write tokens,
then fell back from failed BYOK to Vercel system credentials; `/v4/ai`'s market
and Gateway costs and the subsequent `/v1/generation` record all reported only
the three uncached input and four output tokens (`$0.000069` instead of
`$0.0362265`).

Our billing layer currently repairs only this exact case: an Anthropic-model
cost mismatch with inclusive cache-write accounting whose gap equals the
catalog-stamped cache-write charge. It preserves any separately reported
Gateway add-on and leaves every other mismatch on the Gateway-reported basis.

- **Ask.** Is `marketCost` intended to include every priced token class? Is the
  missing cache-write charge a known `/v4/ai` bug, and is our narrow correction
  safe until it is fixed?
- **Ask.** Which surface is authoritative for billing: inline
  `providerMetadata.gateway`, `/v1/generation`, or `/v1/report`? The fallback
  repro shows that `/v1/generation` can preserve the same omission.
- **Ask.** Are `marketCost`, `cost`, `surchargeCost`, and `gatewayCost` supported
  per-generation fields, and what are their exact overlap/addition semantics
  under BYOK, system credentials, fallback, and separately metered add-ons?

## Next — bounded reliability and observability gaps

- **HITL replay.** eve persists `input.requested` but has no durable
  `input.responded` event, so replaying the server stream reopens answered
  prompts as pending. The React/Vue/Svelte stores project a
  `client.input.responded` event locally, and vercel/eve#588 fixed approval
  results in model history, but neither closes the durable client-replay gap
  for `ask_question`. Our clients append synthetic responded-events from
  client-side storage; persisting the response in the stream would fix every
  client at once.
- **Continuation-token scoping.** A hook's `ctx.channel.continuationToken` is
  the runtime-namespaced form (`eve:eve:<uuid>`), but `ClientSession.send`
  needs the client-facing token (`eve:<uuid>`) — and posting the namespaced
  form doesn't error, it **silently creates a new session** (the continue
  route's get-or-create). We strip the namespace (`clientContinuationToken`)
  and assert the echoed session id; either surfacing the client token on
  `HookContext` or rejecting unknown tokens on continue would remove the trap.
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
  (`eve-invalid-tool-call-events.patch`). Filed by 0thernet as open
  [vercel/eve#542](https://github.com/vercel/eve/issues/542); implemented in
  open [vercel/eve#665](https://github.com/vercel/eve/pull/665), currently
  conflicting with main.
- **No public turn-cancellation API.** eve's durable runtime now propagates
  cancellation through the turn workflow and exposes `ctx.abortSignal` to
  tools, but the HTTP client has no cancel route/method. Aborting the client
  stream still only detaches; the server-side turn runs to completion. Stop
  buttons need a public operation that triggers the cancellation machinery
  already present underneath.
- **Compaction refinements.** eve now derives its threshold from
  `compaction.thresholdPercent` (0.9 by default), honors a distinct authored
  `compaction.model`, and asks the summarizer for short labeled sections. Two
  field-tested goose refinements remain:
  - **Recovery compact.** On `ContextLengthExceeded`, compact and retry the
    step (max 2 attempts; if summarization itself overflows, strip
    tool-response messages middle-outward at 10/20/50/100%). eve still
    surfaces the model error and the turn dies — the failure mode compaction
    exists to prevent.
  - **A mandatory structured prompt.** goose's `compaction.md` requires named
    sections (User Intent, Technical Concepts, Files + Code, Errors + Fixes,
    Pending Tasks, Current Work, optional Next Step) and states "this summary
    will only be read by you." eve's prompt now suggests shorter sections
    "when helpful", but doesn't require the task-state-bearing shape.
- **A source-backed `compaction.model` can still resolve to the turn model.**
  Distinct model ids work, but when the configured compaction model is an
  authored model instance loaded from the same agent config module,
  `loadSourceBackedRuntimeModelReference` resolves that module's turn `model`
  instead. The config silently becomes a no-op; resolving the actual authored
  compaction reference, or rejecting that shape at compile time, would make
  the knob truthful.
- **The eval client's HTTP layer flakes with ECONNRESET under fast streams.**
  Running the coder example's eval suites locally, eve's client
  intermittently dies with `socket hang up` (`ECONNRESET`) — on the stream
  GET (`/eve/v1/session/<id>/stream?startIndex=N`) mid-run or on the very
  first `POST /eve/v1/session` — and the affected eval fails. It usually
  hits whichever eval runs first against the fresh server (`burst` in the
  mock suite, `nothing-missing` in the compaction suite). It reproduces
  on unmodified `main` (3/5 targeted runs of the `burst` scenario, the
  fastest/unpaced stream) so it looks like a keep-alive reuse race in the
  Node HTTP client, not anything app-side. Stream GETs now reconnect on
  socket disconnects, but the initial session POST still gets one attempt
  (apart from the narrow HITL-delivery retry). Retrying a transport reset
  before that POST receives a response — or using `Connection: close` for the
  short-lived eval client — would make `eve evals` runs deterministic.

## Later — schema and ergonomics improvements

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
- **`ask_question`'s options are the off-prior nested shape.** Its `options`
  array of `.strict()` option objects is exactly the shape newer Claude
  models garble (invented trailing keys after long strings), and it has no
  Claude Code analog to ride. Flattening it — or at least dropping
  `.strict()` so the advertised contract matches the (unvalidated) lenient
  runtime — would cut the schema-slop surface every HITL agent presents.
- **The `agent` clone tool can't be disabled.** It's injected after graph
  resolution by `createNodeHarnessTools`, not registered as a framework tool,
  so a `disableTool()` shim for it fails runtime agent-graph resolution —
  every session create 500s. eve now keeps the generic clone root-only and
  defaults `maxSubagentDepth` to 1, which bounds recursion but doesn't let a
  read-only root agent vacate the tool. Either registering `agent` as a
  disableable framework tool or honoring the shim at the harness layer would
  close the gap.
- **AGENTS.md ingestion.** eve injects no repo conventions; every other
  harness (Claude Code, Cursor, Codex) reads `AGENTS.md` natively. Our
  `repoConventions` instruction covers the root file, but first-class support
  belongs in the framework.
