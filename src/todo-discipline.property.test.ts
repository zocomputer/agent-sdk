// fast-check laws for the todo-discipline core:
// - totality at the parse boundary: any JSON value either parses in-contract
//   or returns null — never throws (the wrapper feeds it raw tool input).
// - validity: a list validateTodoWrite passes clean genuinely satisfies the
//   rules, checked against independent 3-line predicates (never by re-running
//   the function under test).
// - formatter totality: every violation list renders without throwing.
import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  formatTodoViolations,
  parseTodoItems,
  TODO_PRIORITIES,
  TODO_STATUSES,
  validateTodoWrite,
  type TodoItem,
} from "./todo-discipline";

const todoItemArb: fc.Arbitrary<TodoItem> = fc.record({
  content: fc.string({ maxLength: 30 }),
  status: fc.constantFrom(...TODO_STATUSES),
  priority: fc.constantFrom(...TODO_PRIORITIES),
});

const todoListArb = fc.array(todoItemArb, { maxLength: 8 });

describe("todo-discipline properties", () => {
  test("parseTodoItems is total over arbitrary JSON and round-trips valid lists", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        // Never throws; null or an in-contract list.
        const parsed = parseTodoItems(value);
        if (parsed !== null) {
          for (const item of parsed) {
            expect(TODO_STATUSES).toContain(item.status);
            expect(TODO_PRIORITIES).toContain(item.priority);
            expect(typeof item.content).toBe("string");
          }
        }
      }),
    );
    fc.assert(
      fc.property(todoListArb, (items) => {
        expect(parseTodoItems(items)).toEqual(items);
      }),
    );
  });

  test("a write that validates clean satisfies the rules (independent predicates)", () => {
    fc.assert(
      fc.property(todoListArb, todoListArb, (next, previous) => {
        const violations = validateTodoWrite({ next, previous });
        if (violations.length > 0) return;
        const contents = next.map((item) => item.content.trim());
        // Non-empty, unique contents.
        expect(contents.every((content) => content !== "")).toBe(true);
        expect(new Set(contents).size).toBe(contents.length);
        // At most one in_progress.
        expect(next.filter((item) => item.status === "in_progress").length).toBeLessThanOrEqual(1);
        // No carried-over pending → completed jump.
        const wasPending = new Set(
          previous.filter((item) => item.status === "pending").map((item) => item.content.trim()),
        );
        for (const item of next) {
          if (item.status === "completed") {
            expect(wasPending.has(item.content.trim())).toBe(false);
          }
        }
      }),
    );
  });

  test("every violation list formats without throwing and names the rejection", () => {
    fc.assert(
      fc.property(todoListArb, todoListArb, (next, previous) => {
        const violations = validateTodoWrite({ next, previous });
        if (violations.length === 0) return;
        const message = formatTodoViolations(violations);
        expect(message).toContain("todo write rejected");
        // One line per violation, after the header.
        expect(message.split("\n").length).toBe(violations.length + 1);
      }),
    );
  });
});
