// The prompt-structure vocabulary under the instruction stack: sections as
// data (id + heading + body) instead of opaque markdown, a depth tier for
// sizing the prose to the model, and a pure composer that lets a consumer
// extend the baseline (insert, omit) without forking its content. Inspired by
// codex's per-model prompt variants — same sections, different depth — but
// generated from one source instead of hand-maintained prompt forks (see
// journal/team/harness-research/2026-07-08-learning-from-codex.md §5).
// Framework-free by design; instructions.ts renders these into eve dynamic
// instructions.

/**
 * Depth variant for the instruction prose. `"full"` is the default — every
 * rule with its rationale and examples. `"compact"` keeps every load-bearing
 * rule and tool name but strips elaboration to roughly a third of the size,
 * for small/code-tuned models where a long behavioral prompt crowds the
 * context (codex ships a ~3× smaller prompt for its code-tuned family the
 * same way). Both variants of a section are authored side by side in one
 * builder, so they can't drift apart the way forked prompt files do. Pick the
 * tier once per session — it interpolates at build time, so the prompt prefix
 * stays byte-stable (prompt-cache safe).
 */
export type InstructionTier = "full" | "compact";

/**
 * One system-prompt section: a stable `id` (placement anchor and omit key),
 * the markdown `heading` (rendered as `## {heading}`), and the tier-rendered
 * `body`. A section with an empty body renders to nothing.
 */
export interface PromptSection {
  /** Stable identifier — the anchor for placement and the key for omission. */
  readonly id: string;
  /** Section heading, without the leading `## `. */
  readonly heading: string;
  /** Markdown body for the chosen tier; empty means "render nothing". */
  readonly body: string;
}

/**
 * Render one section as `## {heading}` followed by its body, or `""` when the
 * body is blank (an absent section contributes nothing to the prompt).
 */
export function renderPromptSection(section: PromptSection): string {
  const body = section.body.trim();
  if (body === "") return "";
  return `## ${section.heading}\n\n${body}`;
}

/**
 * Render sections in order, skipping empty ones, joined by blank lines —
 * the markdown for one composed instruction.
 */
export function renderPromptSections(sections: readonly PromptSection[]): string {
  return sections
    .map(renderPromptSection)
    .filter((rendered) => rendered !== "")
    .join("\n\n");
}

/**
 * Where an extra section lands relative to a baseline section id:
 * `{ before: id }` or `{ after: id }`. An unknown (or omitted) anchor appends
 * the section at the end — a consumer typo degrades to "last", never a throw.
 */
export type SectionPlacement =
  | { readonly before: string }
  | { readonly after: string };

/**
 * A consumer-owned section plus where to place it among the baseline
 * sections. No `placement` appends it at the end. Anchors refer to baseline
 * section ids only — extras can't anchor to other extras.
 */
export interface PlacedPromptSection {
  /** The section to insert. */
  readonly section: PromptSection;
  /** Placement relative to a baseline section id; omitted → appended last. */
  readonly placement?: SectionPlacement | undefined;
}

/**
 * Compose a prompt from a baseline section order plus consumer edits: drop
 * baseline sections by id (`omit`), and insert extras relative to baseline
 * anchors (`extras`). Multiple extras sharing an anchor keep their given
 * order; an extra whose anchor is unknown or omitted appends at the end.
 * Pure — the tested core under `buildInstructionStackSections`.
 */
export function composePromptSections(
  baseline: readonly PromptSection[],
  options?: {
    /** Baseline section ids to drop. */
    omit?: readonly string[] | undefined;
    /** Consumer sections to insert. */
    extras?: readonly PlacedPromptSection[] | undefined;
  },
): PromptSection[] {
  const omit = new Set(options?.omit ?? []);
  const kept = baseline.filter((section) => !omit.has(section.id));
  const keptIds = new Set(kept.map((section) => section.id));

  // Bucket extras by anchor so several extras on one anchor keep their given
  // order (sequential splicing would reverse them).
  const before = new Map<string, PromptSection[]>();
  const after = new Map<string, PromptSection[]>();
  const trailing: PromptSection[] = [];
  for (const extra of options?.extras ?? []) {
    const placement = extra.placement;
    const anchor =
      placement === undefined
        ? undefined
        : "before" in placement
          ? placement.before
          : placement.after;
    if (anchor === undefined || !keptIds.has(anchor)) {
      trailing.push(extra.section);
      continue;
    }
    const bucket = placement !== undefined && "before" in placement ? before : after;
    const list = bucket.get(anchor) ?? [];
    list.push(extra.section);
    bucket.set(anchor, list);
  }

  const composed: PromptSection[] = [];
  for (const section of kept) {
    composed.push(...(before.get(section.id) ?? []));
    composed.push(section);
    composed.push(...(after.get(section.id) ?? []));
  }
  composed.push(...trailing);
  return composed;
}
