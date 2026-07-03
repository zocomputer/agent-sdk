# Standalone by construction

## The decision

The package imports **zero** other `@zocomputer/*` runtime code and ships as
plain TypeScript with `eve` + `zod` as peer dependencies. It is published to
npm and mirrored to a public repo, and its only internal consumer (rib) sits
*outside* the monorepo's bun workspace, importing via `file:` — the same
boundary an external consumer would have.

## Why

- **The boundary keeps the SDK honest.** rib is deliberately a standalone eve
  project, not a workspace member. If rib can consume the package across that
  line, so can anyone; any accidental coupling to the monorepo breaks our own
  dogfood first, not a stranger's install.
- **No house types.** The monorepo has a shared vocabulary
  (`@zocomputer/result`, `type-fest`) that this package deliberately skips:
  a published SDK that forces a `Result` wrapper or re-exports someone's
  utility types taxes every consumer. The type foundation is plain
  discriminated unions + strict TS. Where a client-side package needs one of
  this package's wire constants (chat-core reads the steer field), the
  constant is *mirrored* and pinned by a devDependency equality test rather
  than imported — the zero-import rule outranks DRY here.
- **Raw TS, no build step.** eve projects run TypeScript directly, so the
  package exports `./src/index.ts` as-is. No dist, no bundler drift, and the
  mirror repo is readable source.
- **Extraction deps are WASM/pure-JS only** (`clawpdf` for PDFium, `mammoth`,
  SheetJS, `defuddle`, `linkedom`) — no native postinstalls, so `bun add`
  works everywhere the agent runs.
- **Dependency-free subpaths for UI clients.** `./attachments`, `./steer`,
  and `./steer-inbox` export just the wire contracts and pure readers, so a
  frontend that renders image attachments or steer bubbles doesn't pull the
  extraction stack into its bundle.

## The non-obvious constraint: `file:` resolves devDependencies

bun fully resolves a `file:` target's manifest — devDependencies included. A
`workspace:*` or `catalog:` protocol anywhere in this package's devDeps breaks
the standalone consumer's install outright. So devDependencies use **concrete
versions only** (matching the monorepo catalog pins by hand), with `file:`
refs allowed only for zero-dep siblings like the shared tsconfig — which the
mirror sync then inlines and drops, so the public repo is self-contained.

## The mirror

`scripts/sync-agent-sdk.ts` (monorepo) snapshot-syncs the package to the
public `zocomputer/agent-sdk` repo on every merge touching it: one commit per
sync, message reused from the source commit, internal `AGENTS.md` docs
stripped, tests and fixtures kept. The npm publish reuses the same tree
builder, so the tarball and the mirror can't drift.

## Sources

- `rib/learnings/18-agent-sdk-extraction.md` — the `file:`-across-the-
  workspace-boundary constraint.
- `rib/learnings/29-mid-turn-steering.md` — the mirrored-constant seam.
- `journal/ben/2026-07-03-week-one-in-review.md` — the seams argument: why
  rib sits outside the workspace at all.
