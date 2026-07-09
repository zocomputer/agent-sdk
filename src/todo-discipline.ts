// The discipline core under the `todo` tool wrapper (./tools/todo.ts):
// checklist-state validation as a pure module. eve's framework `todo` accepts
// any list — nothing stops two in_progress items, a pending task silently
// flipping to completed, or duplicate/blank entries. The codex `update_plan`
// note (journal/team/harness-research/2026-07-08-learning-from-codex.md §6)
// argues the rules belong in the tool: a rejected call is feedback the model
// actually corrects on, an ignored guideline isn't. (Codex itself only states
// the rules in its tool description; this is the enforced version.)
//
// The item shape MIRRORS eve's framework-tools/todo (mirrored, not imported —
// the state.ts stance: this module stays framework-free and unit-testable).
// Items are keyed by trimmed content across writes — eve's write is a full
// list replacement with no ids, so content is the only stable identity, and
// the duplicate rule is what keeps that keying sound.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The todo statuses eve's framework `todo` tool accepts. */
export const TODO_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;

/** Lifecycle status of one todo item. */
export type TodoStatus = (typeof TODO_STATUSES)[number];

/** The todo priorities eve's framework `todo` tool accepts. */
export const TODO_PRIORITIES = ["high", "medium", "low"] as const;

/** Priority of one todo item. */
export type TodoPriority = (typeof TODO_PRIORITIES)[number];

/** One checklist item, mirroring eve's framework todo shape. */
export interface TodoItem {
  /** Brief description of the task; also the item's identity across writes. */
  readonly content: string;
  /** Current lifecycle status. */
  readonly status: TodoStatus;
  /** Priority level. */
  readonly priority: TodoPriority;
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

function parseTodoItem(value: unknown): TodoItem | null {
  if (!isRecord(value)) return null;
  const { content, status, priority } = value;
  if (typeof content !== "string") return null;
  if (!isOneOf(status, TODO_STATUSES)) return null;
  if (!isOneOf(priority, TODO_PRIORITIES)) return null;
  return { content, status, priority };
}

/**
 * Parse an unknown value as a todo list (the tool input's `todos` array).
 * Returns `null` when the value isn't an array of well-formed items; unknown
 * extra keys on an item are stripped, matching the schema's strip-mode
 * contract.
 */
export function parseTodoItems(value: unknown): readonly TodoItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: TodoItem[] = [];
  for (const entry of value) {
    const item = parseTodoItem(entry);
    if (item === null) return null;
    items.push(item);
  }
  return items;
}

/**
 * Parse eve's todo tool result (`{ counts, todos }`) down to its item list.
 * Returns `null` when the shape doesn't match — the wrapper then skips the
 * stateful check rather than bricking the tool on a result-shape change.
 */
export function parseTodoListResult(value: unknown): readonly TodoItem[] | null {
  if (!isRecord(value)) return null;
  return parseTodoItems(value.todos);
}

/** One discipline violation found in a todo write. */
export type TodoViolation =
  /** An item's content is empty (or whitespace-only). */
  | { readonly kind: "empty_content"; readonly index: number }
  /** Two or more items share the same (trimmed) content. */
  | { readonly kind: "duplicate_content"; readonly content: string }
  /** More than one item is in_progress. */
  | { readonly kind: "multiple_in_progress"; readonly contents: readonly string[] }
  /** An item tracked as pending in the previous list jumped straight to completed. */
  | { readonly kind: "pending_completed_jump"; readonly content: string };

/**
 * Validate a full-replacement todo write against the discipline rules:
 * non-empty unique contents, at most one `in_progress`, and no
 * `pending` → `completed` jump for an item carried over from the previous
 * list (`previous: null` skips the stateful rule — better an unchecked write
 * than a bricked tool when the prior state can't be read).
 */
export function validateTodoWrite(args: {
  next: readonly TodoItem[];
  previous: readonly TodoItem[] | null;
}): readonly TodoViolation[] {
  const { next, previous } = args;
  const violations: TodoViolation[] = [];

  const seen = new Map<string, number>();
  for (const [index, item] of next.entries()) {
    const content = item.content.trim();
    if (content === "") {
      violations.push({ kind: "empty_content", index });
      continue;
    }
    seen.set(content, (seen.get(content) ?? 0) + 1);
  }
  for (const [content, count] of seen) {
    if (count > 1) violations.push({ kind: "duplicate_content", content });
  }

  const inProgress = next.filter((item) => item.status === "in_progress");
  if (inProgress.length > 1) {
    violations.push({
      kind: "multiple_in_progress",
      contents: inProgress.map((item) => item.content.trim()),
    });
  }

  if (previous !== null) {
    const previousStatus = new Map<string, TodoStatus>();
    for (const item of previous) previousStatus.set(item.content.trim(), item.status);
    for (const item of next) {
      const content = item.content.trim();
      if (item.status === "completed" && previousStatus.get(content) === "pending") {
        violations.push({ kind: "pending_completed_jump", content });
      }
    }
  }

  return violations;
}

function describeViolation(violation: TodoViolation): string {
  switch (violation.kind) {
    case "empty_content":
      return `item ${violation.index + 1} has empty content — every todo needs a short description.`;
    case "duplicate_content":
      return `duplicate content ${JSON.stringify(violation.content)} — content identifies an item across writes, so make each unique.`;
    case "multiple_in_progress":
      return `${violation.contents.length} items are in_progress (${violation.contents
        .map((content) => JSON.stringify(content))
        .join(", ")}) — keep exactly one task in_progress at a time.`;
    case "pending_completed_jump":
      return `${JSON.stringify(violation.content)} jumped pending → completed — mark it in_progress when you start, then completed when done.`;
    default:
      return assertNeverViolation(violation);
  }
}

function assertNeverViolation(violation: never): never {
  throw new Error(`Unknown todo violation: ${JSON.stringify(violation)}`);
}

/**
 * Render violations as the rejection message the tool throws. Leads with the
 * fact that the list is unchanged, then one line per violation, so the model
 * fixes and resends the full list in one shot.
 */
export function formatTodoViolations(violations: readonly TodoViolation[]): string {
  const lines = violations.map((violation) => `- ${describeViolation(violation)}`);
  return [
    "todo write rejected — the list is unchanged. Fix these and resend the full list:",
    ...lines,
  ].join("\n");
}

/**
 * The description rider the `todo` wrapper appends to eve's own tool
 * description at factory time (prompt-cache stable), stating the enforced
 * rules so a rejection never surprises the model.
 */
export const TODO_DISCIPLINE_RIDER = [
  "",
  "Discipline (enforced — an invalid write is rejected and the list stays unchanged):",
  "- Every item needs non-empty content, unique within the list (content identifies an item across writes).",
  "- At most ONE item may be in_progress.",
  "- An item that was pending cannot jump straight to completed — mark it in_progress first, then completed.",
].join("\n");
