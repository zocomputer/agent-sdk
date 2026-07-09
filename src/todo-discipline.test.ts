import { describe, expect, test } from "bun:test";
import { scriptActionFor } from "./mock-model";
import {
  formatTodoViolations,
  parseTodoItems,
  parseTodoListResult,
  TODO_DISCIPLINE_RIDER,
  validateTodoWrite,
  type TodoItem,
} from "./todo-discipline";

function item(content: string, status: TodoItem["status"], priority: TodoItem["priority"] = "medium"): TodoItem {
  return { content, status, priority };
}

describe("parseTodoItems", () => {
  test("parses a well-formed list", () => {
    const parsed = parseTodoItems([
      { content: "a", status: "pending", priority: "high" },
      { content: "b", status: "in_progress", priority: "low" },
    ]);
    expect(parsed).toEqual([item("a", "pending", "high"), item("b", "in_progress", "low")]);
  });

  test("parses the empty list", () => {
    expect(parseTodoItems([])).toEqual([]);
  });

  test("strips unknown extra keys (schema strip-mode contract)", () => {
    const parsed = parseTodoItems([
      { content: "a", status: "pending", priority: "high", id: "x", extra: 1 },
    ]);
    expect(parsed).toEqual([item("a", "pending", "high")]);
  });

  test("rejects non-arrays", () => {
    expect(parseTodoItems(undefined)).toBeNull();
    expect(parseTodoItems("todos")).toBeNull();
    expect(parseTodoItems({ todos: [] })).toBeNull();
  });

  test("rejects malformed items", () => {
    expect(parseTodoItems([null])).toBeNull();
    expect(parseTodoItems(["a"])).toBeNull();
    expect(parseTodoItems([{ content: "a", status: "pending" }])).toBeNull(); // missing priority
    expect(parseTodoItems([{ content: 1, status: "pending", priority: "high" }])).toBeNull();
    expect(parseTodoItems([{ content: "a", status: "done", priority: "high" }])).toBeNull();
    expect(parseTodoItems([{ content: "a", status: "pending", priority: "urgent" }])).toBeNull();
  });
});

describe("parseTodoListResult", () => {
  test("extracts todos from eve's { counts, todos } result", () => {
    const parsed = parseTodoListResult({
      counts: { cancelled: 0, completed: 0, in_progress: 0, pending: 1, total: 1 },
      todos: [{ content: "a", status: "pending", priority: "high" }],
    });
    expect(parsed).toEqual([item("a", "pending", "high")]);
  });

  test("returns null for non-records and missing/malformed todos", () => {
    expect(parseTodoListResult(null)).toBeNull();
    expect(parseTodoListResult([])).toBeNull();
    expect(parseTodoListResult({})).toBeNull();
    expect(parseTodoListResult({ todos: [{ content: "a" }] })).toBeNull();
  });
});

describe("validateTodoWrite", () => {
  test("accepts a fresh legal list", () => {
    const next = [item("plan", "completed"), item("build", "in_progress"), item("test", "pending")];
    expect(validateTodoWrite({ next, previous: [] })).toEqual([]);
  });

  test("accepts the empty write (clearing the list)", () => {
    expect(validateTodoWrite({ next: [], previous: [item("a", "pending")] })).toEqual([]);
  });

  test("rejects empty and whitespace-only content with the item index", () => {
    const violations = validateTodoWrite({
      next: [item("", "pending"), item("  ", "pending"), item("ok", "pending")],
      previous: [],
    });
    expect(violations).toEqual([
      { kind: "empty_content", index: 0 },
      { kind: "empty_content", index: 1 },
    ]);
  });

  test("rejects duplicate contents once per content, trim-keyed", () => {
    const violations = validateTodoWrite({
      next: [item("run tests", "pending"), item(" run tests ", "pending"), item("run tests", "pending")],
      previous: [],
    });
    expect(violations).toEqual([{ kind: "duplicate_content", content: "run tests" }]);
  });

  test("rejects more than one in_progress, naming the items", () => {
    const violations = validateTodoWrite({
      next: [item("a", "in_progress"), item("b", "in_progress"), item("c", "pending")],
      previous: [],
    });
    expect(violations).toEqual([{ kind: "multiple_in_progress", contents: ["a", "b"] }]);
  });

  test("allows exactly one in_progress", () => {
    expect(
      validateTodoWrite({ next: [item("a", "in_progress"), item("b", "pending")], previous: [] }),
    ).toEqual([]);
  });

  test("rejects a pending → completed jump for a carried-over item", () => {
    const violations = validateTodoWrite({
      next: [item("ship", "completed")],
      previous: [item("ship", "pending")],
    });
    expect(violations).toEqual([{ kind: "pending_completed_jump", content: "ship" }]);
  });

  test("matches carried-over items on trimmed content", () => {
    const violations = validateTodoWrite({
      next: [item(" ship ", "completed")],
      previous: [item("ship", "pending")],
    });
    expect(violations).toEqual([{ kind: "pending_completed_jump", content: "ship" }]);
  });

  test("allows in_progress → completed and pending → in_progress/cancelled", () => {
    const violations = validateTodoWrite({
      next: [item("a", "completed"), item("b", "in_progress"), item("c", "cancelled")],
      previous: [item("a", "in_progress"), item("b", "pending"), item("c", "pending")],
    });
    expect(violations).toEqual([]);
  });

  test("allows a NEW item to arrive already completed", () => {
    expect(
      validateTodoWrite({ next: [item("done on arrival", "completed")], previous: [] }),
    ).toEqual([]);
  });

  test("allows reopening a completed item", () => {
    expect(
      validateTodoWrite({
        next: [item("a", "in_progress")],
        previous: [item("a", "completed")],
      }),
    ).toEqual([]);
  });

  test("skips the stateful rule when previous state is unreadable", () => {
    expect(
      validateTodoWrite({ next: [item("ship", "completed")], previous: null }),
    ).toEqual([]);
  });

  test("the mock model's [mock:todo] scripted writes are both legal", () => {
    // Pin against the real script: the e2e todo eval runs these writes
    // through the wrapper, so a rule change that outlaws them must fail here
    // first, not in CI's mock-eval job.
    const writes = [0, 1].map((step) => {
      const action = scriptActionFor("todo", step);
      if (action.kind !== "tool-calls") throw new Error(`step ${step} is not a tool call`);
      const call = action.calls[0];
      if (!call) throw new Error(`step ${step} has no calls`);
      const todos = parseTodoItems(call.input.todos);
      if (todos === null) throw new Error(`step ${step} todos failed to parse`);
      return todos;
    });
    const [step0, step1] = writes;
    if (!step0 || !step1) throw new Error("expected two scripted writes");
    expect(validateTodoWrite({ next: step0, previous: [] })).toEqual([]);
    expect(validateTodoWrite({ next: step1, previous: step0 })).toEqual([]);
  });
});

describe("formatTodoViolations", () => {
  test("leads with the unchanged-list fact and lists each violation", () => {
    const message = formatTodoViolations([
      { kind: "empty_content", index: 2 },
      { kind: "duplicate_content", content: "run tests" },
      { kind: "multiple_in_progress", contents: ["a", "b"] },
      { kind: "pending_completed_jump", content: "ship" },
    ]);
    expect(message).toStartWith(
      "todo write rejected — the list is unchanged. Fix these and resend the full list:",
    );
    expect(message).toContain("item 3 has empty content");
    expect(message).toContain('duplicate content "run tests"');
    expect(message).toContain('2 items are in_progress ("a", "b")');
    expect(message).toContain('"ship" jumped pending → completed');
  });
});

describe("TODO_DISCIPLINE_RIDER", () => {
  test("states the enforced rules", () => {
    expect(TODO_DISCIPLINE_RIDER).toContain("enforced");
    expect(TODO_DISCIPLINE_RIDER).toContain("ONE item may be in_progress");
    expect(TODO_DISCIPLINE_RIDER).toContain("pending cannot jump straight to completed");
  });
});
