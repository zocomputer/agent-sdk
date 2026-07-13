// The search directory's declared ⇒ forwarded guard, sibling to
// media-settings-conformance: for every provider adapter in
// SEARCH_PROVIDER_ADAPTERS and every setting it DECLARES, prove the web_search
// schema accepts the setting and that supplying it observably changes the
// driver call handed to the provider (the attached tool's configuration).
// A declared setting the adapter's buildTool drops fails here, not in
// production; a schema-only knob no adapter declares fails the negative case.

import { describe, expect, test } from "bun:test";

import { SEARCH_PROVIDER_ADAPTERS } from "./search-adapters";
import type { SearchSettingDefinition } from "./search-contracts";
import { webSearchTool, WebSearchInputSchema } from "./web-search";

const context = new Proxy({}, {}) as never;

/** Samples for string/string_list settings, keyed by name. A missing entry fails the suite. */
const SETTING_SAMPLES: Readonly<Record<string, unknown>> = {
  country: "US",
  languages: ["en"],
  include_domains: ["example.com"],
  exclude_domains: ["spam.example"],
};

/** Values worth trying for one definition, ordered to dodge adapter defaults. */
function candidateValues(definition: SearchSettingDefinition): readonly unknown[] {
  switch (definition.kind) {
    case "enum": return [...definition.values].reverse();
    case "integer": return [definition.max, definition.min];
    case "string":
    case "string_list": {
      const sample = SETTING_SAMPLES[definition.name];
      if (sample === undefined) throw new Error(`Add a SETTING_SAMPLES entry for setting "${definition.name}".`);
      return [sample];
    }
  }
}

/** JSON projection of the captured driver call; functions drop out naturally. */
function project(captured: unknown): string {
  return JSON.stringify(captured, (key, value: unknown) => (key === "model" ? undefined : value));
}

async function capture(input: Record<string, unknown>): Promise<string> {
  let captured: unknown;
  const tool = webSearchTool({
    now: () => new Date("2026-07-12T00:00:00.000Z"),
    generate: async (options) => {
      captured = options;
      return { toolResults: [{ output: { results: [] } }] };
    },
  });
  await tool.execute(input as never, context);
  return project(captured);
}

describe("web_search setting conformance (adapter roster is the source of truth)", () => {
  for (const adapter of SEARCH_PROVIDER_ADAPTERS) {
    test(`${adapter.id}: every declared setting reaches the provider tool config`, async () => {
      const base = { query: "conformance probe", provider: adapter.id };
      const baseline = await capture(base);
      for (const setting of adapter.settings) {
        const sample = candidateValues(setting)[0];
        const parsed = WebSearchInputSchema.safeParse({ ...base, [setting.name]: sample });
        expect(parsed.success, `web_search schema rejected declared setting "${setting.name}"`).toBe(true);
        expect(
          (parsed.data as Record<string, unknown>)[setting.name],
          `web_search schema silently dropped declared setting "${setting.name}"`,
        ).toBeDefined();

        let changed = false;
        for (const candidate of candidateValues(setting)) {
          const projected = await capture({ ...base, [setting.name]: candidate });
          if (projected !== baseline) { changed = true; break; }
        }
        expect(
          changed,
          `Setting "${setting.name}" on provider ${adapter.id} never changed the driver call — it is declared but dropped.`,
        ).toBe(true);
      }
    });

    test(`${adapter.id}: an undeclared setting is a corrective error, not a silent drop`, async () => {
      // Every schema setting some OTHER provider declares but this one doesn't
      // must reject with a message naming the provider.
      const declared = new Set(adapter.settings.map(({ name }) => name));
      const foreign = SEARCH_PROVIDER_ADAPTERS.flatMap((other) => other.settings)
        .filter(({ name }) => !declared.has(name));
      for (const setting of foreign) {
        const sample = candidateValues(setting)[0];
        const tool = webSearchTool({ generate: async () => ({ toolResults: [{ output: { results: [] } }] }) });
        const input: Record<string, unknown> = { query: "q", provider: adapter.id, [setting.name]: sample };
        await expect(
          tool.execute(input as never, context),
          `foreign setting "${setting.name}" should reject on ${adapter.id}`,
        ).rejects.toThrow(`not supported by the ${adapter.id} provider`);
      }
    });
  }

  test("every schema setting is declared by at least one provider", () => {
    // A schema knob no adapter declares is unreachable — every provider
    // rejects it — so it must not exist in the schema at all.
    const declared = new Set(SEARCH_PROVIDER_ADAPTERS.flatMap(({ settings }) => settings.map(({ name }) => name)));
    const schemaKeys = Object.keys(WebSearchInputSchema.shape).filter(
      (key) => key !== "query" && key !== "provider",
    );
    for (const key of schemaKeys) {
      expect(declared.has(key), `schema setting "${key}" is declared by no provider`).toBe(true);
    }
  });

  test("the roster itself stays covered", () => {
    expect(SEARCH_PROVIDER_ADAPTERS.map(({ id }) => id).sort()).toEqual(["exa", "parallel", "perplexity"]);
  });
});
