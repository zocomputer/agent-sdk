import { describe, expect, test } from "bun:test";
import { defineTool, type ToolContext } from "eve/tools";
import { z } from "zod";
import { readSteerMessages, STEER_FIELD, STEER_NOTE, type SteerMessage } from "./steer";
import { createSteerWrapper, withSteerDelivery, type SteerSource } from "./steer-tool";

const ctx: ToolContext = {
  session: {
    id: "steer-session",
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

function queueOf(...texts: string[]): { inbox: SteerSource; drained: string[] } {
  let queue: SteerMessage[] = texts.map((text, index) => ({
    id: `m${index + 1}`,
    text,
    at: index + 1,
  }));
  const drained: string[] = [];
  return {
    drained,
    inbox: {
      drain(sessionId) {
        drained.push(sessionId);
        const taken = queue;
        queue = [];
        return taken;
      },
    },
  };
}

const recordTool = defineTool({
  description: "returns a record",
  inputSchema: z.object({}),
  execute: () => ({ ok: true, count: 3 }),
});

describe("withSteerDelivery", () => {
  test("drains keyed by session id and attaches messages to a record output", async () => {
    const { inbox, drained } = queueOf("focus on the tests", "skip the docs");
    const tool = withSteerDelivery(recordTool, inbox);
    const output = await tool.execute({}, ctx);
    expect(drained).toEqual(["steer-session"]);
    expect(output).toMatchObject({ ok: true, count: 3 });
    expect(readSteerMessages(output)?.map((m) => m.text)).toEqual([
      "focus on the tests",
      "skip the docs",
    ]);
  });

  test("an empty inbox leaves the output untouched", async () => {
    const { inbox } = queueOf();
    const tool = withSteerDelivery(recordTool, inbox);
    const output = await tool.execute({}, ctx);
    expect(output).toEqual({ ok: true, count: 3 });
  });

  test("a thrown execute stays thrown and drains nothing", async () => {
    const { inbox, drained } = queueOf("too late");
    const throwingTool = defineTool({
      description: "throws",
      inputSchema: z.object({}),
      execute: () => {
        throw new Error("boom");
      },
    });
    const tool = withSteerDelivery(throwingTool, inbox);
    await expect(tool.execute({}, ctx)).rejects.toThrow("boom");
    expect(drained).toEqual([]);
  });

  test("wraps a non-record output recoverably", async () => {
    const { inbox } = queueOf("redirect");
    const stringTool = defineTool({
      description: "returns a string",
      inputSchema: z.object({}),
      execute: () => "plain text result",
    });
    const tool = withSteerDelivery(stringTool, inbox);
    const output = await tool.execute({}, ctx);
    expect(readSteerMessages(output)?.map((m) => m.text)).toEqual(["redirect"]);
    expect((output as unknown as Record<string, unknown>).steer_wrapped_output).toBe(
      "plain text result",
    );
  });

  test("re-merges steers after a json-narrowing toModelOutput", async () => {
    const { inbox } = queueOf("look here");
    const narrowingTool = defineTool({
      description: "narrows",
      inputSchema: z.object({}),
      execute: () => ({ visible: "yes", secret: "drop me" }),
      toModelOutput: (output) => ({ type: "json" as const, value: { visible: output.visible } }),
    });
    const tool = withSteerDelivery(narrowingTool, inbox);
    const output = await tool.execute({}, ctx);
    const modelOutput = await tool.toModelOutput?.(output);
    if (modelOutput?.type !== "json") throw new Error("expected json model output");
    const value = modelOutput.value as Record<string, unknown>;
    expect(value.visible).toBe("yes");
    expect("secret" in value).toBe(false);
    expect(readSteerMessages(value)?.map((m) => m.text)).toEqual(["look here"]);
  });

  test("appends the steer block after a text-mode toModelOutput", async () => {
    const { inbox } = queueOf("change course");
    const textTool = defineTool({
      description: "text output",
      inputSchema: z.object({}),
      execute: () => ({ body: "original body" }),
      toModelOutput: (output) => ({ type: "text" as const, value: output.body }),
    });
    const tool = withSteerDelivery(textTool, inbox);
    const output = await tool.execute({}, ctx);
    const modelOutput = await tool.toModelOutput?.(output);
    if (modelOutput?.type !== "text") throw new Error("expected text model output");
    expect(modelOutput.value.startsWith("original body")).toBe(true);
    expect(modelOutput.value).toContain(STEER_NOTE);
    expect(modelOutput.value).toContain("change course");
  });

  test("delegates toModelOutput unchanged when no steers are pending", async () => {
    const { inbox } = queueOf();
    const narrowingTool = defineTool({
      description: "narrows",
      inputSchema: z.object({}),
      execute: () => ({ visible: "yes" }),
      toModelOutput: (output) => ({ type: "json" as const, value: output }),
    });
    const tool = withSteerDelivery(narrowingTool, inbox);
    const output = await tool.execute({}, ctx);
    const modelOutput = await tool.toModelOutput?.(output);
    expect(modelOutput).toEqual({ type: "json", value: { visible: "yes" } });
  });

  test("doesn't add toModelOutput to a tool that has none", () => {
    const { inbox } = queueOf("msg");
    const tool = withSteerDelivery(recordTool, inbox);
    expect(tool.toModelOutput).toBeUndefined();
  });

  test("returns a distinct definition and leaves the original unmutated", () => {
    const { inbox } = queueOf();
    const tool = withSteerDelivery(recordTool, inbox);
    expect(tool).not.toBe(recordTool);
    expect(tool.description).toBe(recordTool.description);
    expect(STEER_FIELD in recordTool).toBe(false);
  });
});

describe("createSteerWrapper", () => {
  test("identity when no inbox is configured", () => {
    expect(createSteerWrapper(null)(recordTool)).toBe(recordTool);
  });

  test("wraps with steer delivery when an inbox is configured", async () => {
    const { inbox } = queueOf("go");
    const tool = createSteerWrapper(inbox)(recordTool);
    const output = await tool.execute({}, ctx);
    expect(readSteerMessages(output)?.map((m) => m.text)).toEqual(["go"]);
  });
});
