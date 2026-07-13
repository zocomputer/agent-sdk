import { describe, expect, test } from "bun:test";
import { defineTool, type ToolContext, type ToolDefinition } from "eve/tools";
import { parseTodoItems, TODO_DISCIPLINE_RIDER, type TodoItem } from "../todo-discipline";
import { createTodoTool } from "./todo";

// A stand-in for eve's framework todo with the same read/write semantics:
// `todos` present replaces the closure state, absent reads it, both return
// eve's { counts, todos } shape. The real base needs a live eve session
// (loadContext), so tests inject this.
function fakeBase(): { base: ToolDefinition; state: () => readonly TodoItem[] } {
  let items: readonly TodoItem[] = [];
  const base: ToolDefinition = defineTool({
    description: "base todo description",
    inputSchema: { type: "object" },
    async execute(input: unknown): Promise<unknown> {
      const todosValue =
        typeof input === "object" && input !== null && "todos" in input
          ? input.todos
          : undefined;
      const next = todosValue === undefined ? null : parseTodoItems(todosValue);
      if (next !== null) items = next;
      const counts = { total: items.length };
      return { counts, todos: items };
    },
  });
  return { base, state: () => items };
}

function ctxWith(sessionId: string): ToolContext {
  return {
    abortSignal: new AbortController().signal,
    callId: "call-1",
    session: {
      id: sessionId,
      auth: { current: null, initiator: null },
      turn: { id: "turn-1", sequence: 1 },
    },
    getSandbox: () => Promise.reject(new Error("no sandbox in tests")),
    getSkill: () => {
      throw new Error("no skills in tests");
    },
    getToken: () => Promise.reject(new Error("no auth in tests")),
    requireAuth: () => {
      throw new Error("no auth in tests");
    },
  };
}
const ctx = ctxWith("todo-test");

function item(content: string, status: TodoItem["status"]): TodoItem {
  return { content, status, priority: "medium" };
}

describe("createTodoTool", () => {
  test("appends the discipline rider to the base description once, at factory time", () => {
    const { base } = fakeBase();
    const tool = createTodoTool({ base });
    expect(tool.description).toBe(`base todo description\n${TODO_DISCIPLINE_RIDER}`);
  });

  test("reuses the base schemas verbatim (model-facing contract unchanged)", () => {
    const { base } = fakeBase();
    const tool = createTodoTool({ base });
    expect(tool.inputSchema).toBe(base.inputSchema);
    expect(tool.outputSchema).toBe(base.outputSchema);
  });

  test("passes a legal write through to the base and returns its result", async () => {
    const { base, state } = fakeBase();
    const tool = createTodoTool({ base });
    const todos = [item("build", "in_progress"), item("test", "pending")];
    const result = await tool.execute({ todos }, ctx);
    expect(result).toEqual({ counts: { total: 2 }, todos });
    expect(state()).toEqual(todos);
  });

  test("passes reads through without validation", async () => {
    const { base, state } = fakeBase();
    const tool = createTodoTool({ base });
    await tool.execute({ todos: [item("a", "in_progress")] }, ctx);
    const result = await tool.execute({}, ctx);
    expect(result).toEqual({ counts: { total: 1 }, todos: [item("a", "in_progress")] });
    expect(state()).toEqual([item("a", "in_progress")]);
  });

  test("rejects an invalid write and leaves the base state unchanged", async () => {
    const { base, state } = fakeBase();
    const tool = createTodoTool({ base });
    const before = [item("a", "pending")];
    await tool.execute({ todos: before }, ctx);
    await expect(
      tool.execute({ todos: [item("x", "in_progress"), item("y", "in_progress")] }, ctx),
    ).rejects.toThrow("keep exactly one task in_progress");
    expect(state()).toEqual(before);
  });

  test("rejects a pending → completed jump against the base's durable state", async () => {
    const { base, state } = fakeBase();
    const tool = createTodoTool({ base });
    await tool.execute({ todos: [item("ship", "pending")] }, ctx);
    await expect(tool.execute({ todos: [item("ship", "completed")] }, ctx)).rejects.toThrow(
      "jumped pending → completed",
    );
    expect(state()).toEqual([item("ship", "pending")]);
    // The legal path: in_progress first, then completed.
    await tool.execute({ todos: [item("ship", "in_progress")] }, ctx);
    await tool.execute({ todos: [item("ship", "completed")] }, ctx);
    expect(state()).toEqual([item("ship", "completed")]);
  });

  test("serializes batched writes — the later one validates against committed, not stale, state", async () => {
    const { base, state } = fakeBase();
    const tool = createTodoTool({ base });
    await tool.execute({ todos: [item("ship", "pending")] }, ctx);
    // eve runs a step's tool calls concurrently. Without the per-session
    // lock both writes read the same pending snapshot, so the completed
    // write false-rejects as a pending → completed jump even though the
    // in_progress write commits first and makes it legal.
    await Promise.all([
      tool.execute({ todos: [item("ship", "in_progress")] }, ctx),
      tool.execute({ todos: [item("ship", "completed")] }, ctx),
    ]);
    expect(state()).toEqual([item("ship", "completed")]);
  });

  test("the rejection message lists every violation with the unchanged-list lead", async () => {
    const { base } = fakeBase();
    const tool = createTodoTool({ base });
    const bad = [item("", "pending"), item("dup", "in_progress"), item("dup", "in_progress")];
    let error: unknown = null;
    try {
      await tool.execute({ todos: bad }, ctx);
    } catch (thrown) {
      error = thrown;
    }
    expect(error).toBeInstanceOf(Error);
    const message = error instanceof Error ? error.message : "";
    expect(message).toStartWith("todo write rejected — the list is unchanged.");
    expect(message).toContain("item 1 has empty content");
    expect(message).toContain('duplicate content "dup"');
    expect(message).toContain("2 items are in_progress");
  });

  test("skips the discipline check when todos fail to parse (shape drift)", async () => {
    const { base } = fakeBase();
    const tool = createTodoTool({ base });
    // eve's schema would reject this before execute; if a drift ever lets it
    // through, the wrapper delegates instead of bricking the tool.
    const result = await tool.execute({ todos: "not-a-list" }, ctx);
    expect(result).toEqual({ counts: { total: 0 }, todos: [] });
  });

  test("defaults to eve's framework todo (description carries eve's prose + the rider)", () => {
    const tool = createTodoTool();
    expect(tool.description).toContain("Only have ONE task in_progress at a time");
    expect(tool.description).toContain("Discipline (enforced");
  });
});
