import { describe, expect, test } from "bun:test";

import { mapsSearchTool } from "./maps-search";

const context = new Proxy({}, {}) as never;

describe("mapsSearchTool", () => {
  test("returns the grounded answer with parsed sources and search.maps lineage", async () => {
    let captured: unknown;
    const tool = mapsSearchTool({
      generate: async (options) => {
        captured = options;
        return {
          text: "Blue Bottle at 1 Ferry Building is open until 7pm.",
          sources: [
            { sourceType: "url", url: "https://maps.google.com/place/1", title: "Blue Bottle" },
            { malformed: true },
          ],
        };
      },
    });
    const output = await tool.execute({ query: "coffee near Ferry Building" }, context);
    expect(output.answer).toContain("Blue Bottle");
    expect(output.sources).toEqual([{ url: "https://maps.google.com/place/1", title: "Blue Bottle" }]);
    const call = captured as { tools: Record<string, unknown>; headers: Record<string, string> };
    expect(Object.keys(call.tools)).toEqual(["google_maps"]);
    expect(call.headers["x-zo-tool"]).toBe("maps_search");
    expect(call.headers["x-zo-media-lineage"]).toContain("search.maps");
  });

  test("fails closed on an empty answer", async () => {
    const tool = mapsSearchTool({ generate: async () => ({ text: "  ", sources: [] }) });
    await expect(tool.execute({ query: "q" }, context)).rejects.toThrow("empty answer");
  });

  test("fails closed when Maps sources are absent or not usable citations", async () => {
    // Grounding can't be toolChoice-forced; prose without citations must not
    // pass as Maps data. Empty/relative/non-HTTP/credential-bearing URLs do
    // not count merely because they are strings.
    for (const sources of [
      [],
      [{ url: "" }],
      [{ url: "relative/place" }],
      [{ url: "javascript:alert(1)" }],
      [{ url: "https://user:secret@maps.example/place" }],
    ]) {
      const tool = mapsSearchTool({ generate: async () => ({ text: "Probably near the park?", sources }) });
      await expect(tool.execute({ query: "q" }, context)).rejects.toThrow("without Maps grounding sources");
    }
  });

  test("bounds an oversized answer", async () => {
    const tool = mapsSearchTool({
      generate: async () => ({ text: "y".repeat(20_000), sources: [{ sourceType: "url", url: "https://maps.google.com/place/2" }] }),
    });
    const output = await tool.execute({ query: "q" }, context);
    expect(output.answer.length).toBe(8_000);
  });
});
