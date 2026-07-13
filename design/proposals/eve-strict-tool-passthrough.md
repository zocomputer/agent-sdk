# eve proposal: pass per-tool `strict` / `providerOptions` through to the AI SDK

**Status: worked design, patch not built.** The AI SDK already carries a
per-tool `strict` flag to providers — Anthropic's grammar-constrained
sampling, OpenAI's strict function calling — but eve's tool wrapper drops it,
so no eve agent can enable schema-guaranteed tool calls. The fix is a
passthrough: two optional fields on the tool definition, forwarded at one
call site.

## Why

Anthropic's `strict: true` compiles a tool's `input_schema` into a grammar
and constrains sampling to schema-valid output — the documented fix for
newer Claude models (Opus 4.8, Sonnet 5) garbling off-prior tool schemas
with invented keys ([Better Models: Worse Tools](https://lucumr.pocoo.org/2026/7/4/better-models-worse-tools/)).
The plumbing below eve is done: the AI SDK's tool-preparation loop reads
`tool.strict` and `tool.providerOptions` and forwards both on the
language-model function-tool payload (`ai` 7.x, `prepareToolsAndToolChoice` —
`...strict != null ? { strict } : {}`). eve's `buildToolSet`
(`packages/eve/src/harness/tools.ts`) is the one place that constructs the
AI SDK `tool()` from an eve definition, and it passes `description`,
`execute`, `inputSchema`, `outputSchema`, and a `toModelOutput` adapter —
nothing else. Both fields die there.

Without the passthrough, a harness that measures real schema misuse (see
[`eve-invalid-tool-call-events.md`](./eve-invalid-tool-call-events.md), the
companion observability ask) has no lever to pull when the data says a tool
needs constraining.

## What changes, precisely

### 1. The definition types

`readonly strict?: boolean` and
`readonly providerOptions?: Record<string, unknown>` (whatever JSON-value
type the codebase prefers) on:

- the authored tool definition (`packages/eve/src/shared/tool-definition.ts`
  and the `defineTool` wrapper that stamps it), and
- `DynamicToolEntry`
  (`packages/eve/src/shared/dynamic-tool-definition.ts`), so dynamic
  toolsets get the same control.

### 2. The passthrough (`packages/eve/src/harness/tools.ts`)

In `buildToolSet`, spread both fields into the `tool()` construction when
present:

```ts
const u = tool({
  description: s.description,
  execute: wrapToolExecute(s),
  inputSchema: s.inputSchema,
  outputSchema: s.outputSchema,
  ...(s.strict !== undefined ? { strict: s.strict } : {}),
  ...(s.providerOptions !== undefined ? { providerOptions: s.providerOptions } : {}),
  // …existing toModelOutput wiring unchanged
});
```

`buildToolSetFromDefinitions` (dynamic tools) flows through the same
function, so one change covers both.

### 3. Compiler/manifest survival

Authored static tools round-trip through the build manifest; the two fields
must survive serialization the way `description`/schemas do. (Dynamic tools
are constructed live and need nothing extra.)

### 4. Tests

A harness test asserting a `defineTool({ strict: true })` lands as
`strict: true` on the language-model tool payload, and that an undefined
flag stays absent (no behavior change for existing agents).

## Semantics and edge cases

- **Per-tool opt-in, no global switch.** Anthropic applies schema-complexity
  limits under strict mode and caches compiled grammars; a blanket flag
  would trip the limits on large toolsets. Tool authors opt in where the
  data says it matters.
- **Strict-subset compliance is the author's contract.** Anthropic's strict
  mode requires `additionalProperties: false` (the AI SDK's zod conversion
  already adds it recursively) and rejects some keywords (`minLength`,
  `minimum`, `pattern`, …). Anthropic's own SDKs strip those client-side;
  whether eve sanitizes or documents-and-rejects is upstream's call — the
  honest minimum is documenting that a strict tool's schema must stay inside
  the supported subset.
- **Non-supporting providers.** The flag rides the provider-spec payload;
  providers without a strict concept ignore it. No degrade logic needed in
  eve.
- **`providerOptions` is the general escape hatch** the AI SDK already
  defines per tool; forwarding it costs nothing extra and covers future
  provider-specific tool knobs without another eve release.

## Verification (at patch time)

Confirm against source what the shipped `dist` shows: `buildToolSet` is the
sole `tool()` construction site for authored + dynamic tools, and the AI
SDK version in range forwards `strict` for the provider path eve uses
(including the gateway). Then the test above, plus one live call against
Anthropic with `strict: true` and a deliberately slop-prone nested schema to
observe the constraint working.

## What it unlocks downstream

`@zocomputer/agent-sdk` can expose a `strictToolSchemas` option on
the composed toolset and A/B it against the misuse baseline from the
invalid-call-events proposal — constrained decoding has known quality
trade-offs, so we want the lever and the measurement, then the decision.
