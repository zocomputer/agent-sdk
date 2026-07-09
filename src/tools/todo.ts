// Overrides eve's framework `todo` with the discipline-enforcing wrapper:
// same durable state, same schemas, same result shape — plus the write rules
// from ../todo-discipline.ts checked BEFORE the write reaches eve, so an
// invalid list is rejected with the state unchanged and the model corrects in
// one shot. The rules live in the tool, not an instruction, because a
// rejected call is feedback the model actually acts on (the codex lesson —
// which codex itself only states in prose; this is the enforced version).
//
// State stays eve's: the wrapper reads the current list through the base
// executor (`base.execute({}, ctx)` is eve's read) and delegates every write
// to it, so the closure-bound ContextKey state, the UI's todo rendering, and
// the compaction re-injection all keep working untouched. eve's defaults doc
// blesses exactly this seam ("Spreading the default keeps its closure-bound
// state behavior").

import { defineTool, type ToolContext, type ToolDefinition } from "eve/tools";
import { todo as eveTodo } from "eve/tools/defaults";
import { withPathLock } from "../path-locks";
import {
  formatTodoViolations,
  parseTodoItems,
  parseTodoListResult,
  TODO_DISCIPLINE_RIDER,
  validateTodoWrite,
} from "../todo-discipline";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Build the discipline-enforcing `todo` tool: eve's framework todo (durable
 * state, schemas, and result shape untouched) with write validation in front —
 * non-empty unique contents, at most one `in_progress`, no
 * `pending` → `completed` jump. An invalid write throws with per-violation
 * guidance and leaves the list unchanged; reads and valid writes pass through.
 */
export function createTodoTool(
  opts: {
    /** The framework todo to wrap. Defaults to eve's; injectable for tests. */
    base?: ToolDefinition;
  } = {},
): ToolDefinition {
  const base = opts.base ?? eveTodo;
  return defineTool({
    ...base,
    description: `${base.description}\n${TODO_DISCIPLINE_RIDER}`,
    async execute(input: unknown, ctx: ToolContext) {
      const todosValue = isRecord(input) ? input.todos : undefined;
      // eve's schema validation runs before execute, so a failed parse means
      // shape drift — skip the discipline check and let the base behave as it
      // would have, rather than brick writes. `undefined` is eve's read.
      const next = todosValue === undefined ? null : parseTodoItems(todosValue);
      if (next === null) return base.execute(input, ctx);
      // Serialize the read-validate-write per session: eve runs a step's tool
      // calls concurrently, so two batched writes would otherwise both read
      // the same snapshot and the later one would validate against stale
      // state (e.g. a false pending → completed reject after the first write
      // legally moved the item to in_progress). FIFO per session id, same
      // seam as edit/write's per-path lock.
      return withPathLock(`todo:${ctx.session.id}`, async () => {
        // Read the current list through the base executor (input without
        // `todos` is eve's read — it never modifies state).
        const previous = parseTodoListResult(await base.execute({}, ctx));
        const violations = validateTodoWrite({ next, previous });
        if (violations.length > 0) {
          throw new Error(formatTodoViolations(violations));
        }
        return base.execute(input, ctx);
      });
    },
  });
}
