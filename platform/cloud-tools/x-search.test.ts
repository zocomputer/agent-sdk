import { describe, expect, test } from "bun:test";

import { xSearchTool } from "./x-search";

const context = new Proxy({}, {}) as never;

const posts = {
  query: "zo launch",
  posts: [
    { author: "zodotcomputer", text: "We shipped.", url: "https://x.com/zo/1", likes: 42 },
    { author: "fan", text: "x".repeat(3_000), url: "https://x.com/fan/2", likes: 7 },
  ],
};

describe("xSearchTool", () => {
  test("delegates to a Grok driver with the forced x_search tool and search.x lineage", async () => {
    let captured: unknown;
    const tool = xSearchTool({ generate: async (options) => { captured = options; return { toolResults: [{ output: posts }] }; } });
    const output = await tool.execute({ query: "zo launch", allowed_x_handles: ["zodotcomputer"] }, context);
    expect(output.posts[0]).toEqual({ author: "zodotcomputer", text: "We shipped.", url: "https://x.com/zo/1", likes: 42 });
    expect(output.posts[1]?.text.length).toBe(1_000);
    const call = captured as { toolChoice: unknown; headers: Record<string, string> };
    expect(call.toolChoice).toEqual({ type: "tool", toolName: "x_search" });
    expect(call.headers["x-zo-tool"]).toBe("x_search");
    expect(call.headers["x-zo-media-lineage"]).toContain("search.x");
    expect(call.headers["x-zo-media-lineage"]).toContain("xai/grok-4.3");
  });

  test("rejects combining allowed and excluded handles before any driver call", async () => {
    let calls = 0;
    const tool = xSearchTool({ generate: async () => { calls += 1; return { toolResults: [] }; } });
    await expect(
      tool.execute({ query: "q", allowed_x_handles: ["a"], excluded_x_handles: ["b"] }, context),
    ).rejects.toThrow("not both");
    expect(calls).toBe(0);
  });

  test("fails closed on unreadable tool output", async () => {
    const tool = xSearchTool({ generate: async () => ({ toolResults: [{ output: { unexpected: true } }] }) });
    await expect(tool.execute({ query: "q" }, context)).rejects.toThrow("no readable posts");
  });

  test("drops posts without usable HTTP(S) citation URLs", async () => {
    const tool = xSearchTool({
      generate: async () => ({
        toolResults: [{
          output: {
            query: "q",
            posts: [
              { author: "blank", text: "blank", url: "", likes: 1 },
              { author: "script", text: "script", url: "javascript:alert(1)", likes: 2 },
              { author: "valid", text: "valid", url: "https://x.com/valid/status/1", likes: 3 },
            ],
          },
        }],
      }),
    });
    const output = await tool.execute({ query: "q" }, context);
    expect(output.posts).toEqual([
      { author: "valid", text: "valid", url: "https://x.com/valid/status/1", likes: 3 },
    ]);
  });
});
