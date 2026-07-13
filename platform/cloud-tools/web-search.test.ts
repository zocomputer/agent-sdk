import { describe, expect, test } from "bun:test";
import { gateway } from "@ai-sdk/gateway";
import type { InferToolOutput } from "ai";

import { webSearchTool, type DriverCallResult, type WebSearchToolOptions } from "./web-search";
import { boundSearchResults } from "./search-contracts";

const context = new Proxy({}, {}) as never;

// The AI SDK's own tool output types are the drift guard for what the
// providers return (the BFL-pin pattern): these fixtures are TYPED as the
// gateway package's declared output shapes, so a renamed field (`snippet`,
// `publishDate`, …) in a Renovate bump breaks compilation here, not
// parseResults silently at runtime. The gateway package doesn't export the
// types directly; InferToolOutput derives them from the typed factories.
type ExaOutput = Extract<InferToolOutput<ReturnType<typeof gateway.tools.exaSearch>>, { results: unknown }>;
type ParallelOutput = Extract<InferToolOutput<ReturnType<typeof gateway.tools.parallelSearch>>, { results: unknown }>;
type PerplexityOutput = Extract<InferToolOutput<ReturnType<typeof gateway.tools.perplexitySearch>>, { results: unknown }>;

function exaOutput(): ExaOutput {
  return {
    requestId: "req-1",
    results: [
      { title: "Result A", url: "https://a.example", id: "a", summary: "Summary A", publishedDate: "2026-07-01" },
      { title: "Result B", url: "https://b.example", id: "b", highlights: ["First", "Second"] },
    ],
  };
}

const parallelOutput: ParallelOutput = {
  searchId: "s1",
  results: [{ url: "https://c.example", title: "C", excerpt: "c excerpt", publishDate: "2026-07-02" }],
};

const perplexityOutput: PerplexityOutput = {
  id: "p1",
  results: [{ title: "P", url: "https://p.example", snippet: "p snippet", date: "2026-07-03" }],
};

function tool(overrides: Partial<WebSearchToolOptions> & { output?: unknown; capture?: (options: unknown) => void } = {}) {
  return webSearchTool({
    now: () => new Date("2026-07-12T00:00:00.000Z"),
    generate: async (options): Promise<DriverCallResult> => {
      overrides.capture?.(options);
      return { toolResults: [{ output: overrides.output ?? exaOutput() }] };
    },
    ...(overrides.driverModelId === undefined ? {} : { driverModelId: overrides.driverModelId }),
  });
}

describe("webSearchTool", () => {
  test("defaults to Exa, forces the tool call, and normalizes typed results", async () => {
    let captured: unknown;
    const output = await tool({ capture: (options) => { captured = options; } }).execute({ query: "zo computer" }, context);
    expect(output.provider).toBe("exa");
    expect(output.results).toEqual([
      { title: "Result A", url: "https://a.example/", excerpt: "Summary A", published: "2026-07-01" },
      { title: "Result B", url: "https://b.example/", excerpt: "First … Second" },
    ]);
    const call = captured as { toolChoice: unknown; tools: Record<string, unknown>; headers: Record<string, string>; prompt: string };
    expect(call.toolChoice).toEqual({ type: "tool", toolName: "exa_search" });
    expect(Object.keys(call.tools)).toEqual(["exa_search"]);
    expect(call.headers["x-zo-tool"]).toBe("web_search");
    expect(call.headers["x-zo-media-lineage"]).toContain("search.web");
    expect(call.prompt).toContain("zo computer");
  });

  test("provider selection changes the attached gateway tool and parses typed outputs", async () => {
    let captured: unknown;
    const parallel = await tool({
      output: parallelOutput,
      capture: (options) => { captured = options; },
    }).execute({ query: "q", provider: "parallel" }, context);
    expect(Object.keys((captured as { tools: Record<string, unknown> }).tools)).toEqual(["parallel_search"]);
    expect(parallel.results).toEqual([{ title: "C", url: "https://c.example/", excerpt: "c excerpt", published: "2026-07-02" }]);

    const perplexity = await tool({ output: perplexityOutput }).execute({ query: "q", provider: "perplexity" }, context);
    expect(perplexity.results).toEqual([{ title: "P", url: "https://p.example/", excerpt: "p snippet", published: "2026-07-03" }]);
  });

  test("surfaces the provider's structured error as a corrective failure", async () => {
    await expect(
      tool({ output: { error: "rate_limit", message: "Slow down." } }).execute({ query: "q" }, context),
    ).rejects.toThrow("rate_limit: Slow down.");
  });

  test("fails closed when the driver returns no tool result", async () => {
    const noResult = webSearchTool({ generate: async () => ({ toolResults: [] }) });
    await expect(noResult.execute({ query: "q" }, context)).rejects.toThrow("no tool result");
  });

  test("drops provider results without usable HTTP(S) citation URLs", async () => {
    const output = await tool({
      output: {
        requestId: "req-invalid-urls",
        results: [
          { title: "Blank", url: "", id: "blank", summary: "blank" },
          { title: "Script", url: "javascript:alert(1)", id: "script", summary: "script" },
          { title: "Valid", url: "https://valid.example/path", id: "valid", summary: "valid" },
        ],
      },
    }).execute({ query: "q" }, context);
    expect(output.results).toEqual([
      { title: "Valid", url: "https://valid.example/path", excerpt: "valid" },
    ]);
  });

  test("model output carries bounded excerpts and no raw provider payload", async () => {
    const executed = await tool().execute({ query: "q" }, context);
    const rendered = await webSearchTool().toModelOutput?.(executed);
    expect(rendered).toMatchObject({ type: "text" });
    if (rendered?.type === "text" && typeof rendered.value === "string") {
      expect(rendered.value).toContain("https://a.example");
      expect(rendered.value).not.toContain("requestId");
    }
  });
});

describe("boundSearchResults", () => {
  test("caps result count and excerpt lengths", () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      title: `t${index}`,
      url: `https://example/${index}`,
      excerpt: "x".repeat(5_000),
    }));
    const bounded = boundSearchResults(many);
    expect(bounded.length).toBeLessThanOrEqual(20);
    for (const item of bounded) expect(item.excerpt.length).toBeLessThanOrEqual(2_000);
    const total = bounded.reduce((sum, item) => sum + item.excerpt.length, 0);
    expect(total).toBeLessThanOrEqual(24_000);
  });
});
