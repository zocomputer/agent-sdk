// Discovery for the web-search directory — search_providers is to web_search
// what media_models is to the media tools. Search providers are curated
// adapters (no live catalog), so this lists the roster with each provider's
// strengths, supported options, and adapter revision.

import { defineTool } from "eve/tools";
import { z } from "zod";

import { SEARCH_PROVIDER_ADAPTERS } from "./search-adapters";
import { CLOUD_TOOL_META } from "./tool-meta";

export const SearchProvidersInputSchema = z.object({
  provider: z.enum(["exa", "parallel", "perplexity"]).optional().describe("Inspect one provider; omit to list all."),
});

const SettingSchema = z.object({
  name: z.string(),
  kind: z.string(),
  description: z.string(),
  values: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const ProviderSchema = z.object({
  id: z.string(),
  description: z.string(),
  strengths: z.string(),
  settings: z.array(SettingSchema),
  adapter_revision: z.string(),
  verified_at: z.string(),
});

export const SearchProvidersOutputSchema = z.object({
  default_provider: z.string(),
  providers: z.array(ProviderSchema),
});

export type SearchProvidersInput = z.infer<typeof SearchProvidersInputSchema>;
export type SearchProvidersOutput = z.infer<typeof SearchProvidersOutputSchema>;

export function searchProvidersTool() {
  return defineTool({
    description: CLOUD_TOOL_META["search-providers"].description,
    inputSchema: SearchProvidersInputSchema,
    outputSchema: SearchProvidersOutputSchema,
    execute(input): SearchProvidersOutput {
      const roster = SEARCH_PROVIDER_ADAPTERS.filter(
        (adapter) => input.provider === undefined || adapter.id === input.provider,
      );
      if (roster.length === 0) {
        throw new Error(`Unknown provider. Choose one of: ${SEARCH_PROVIDER_ADAPTERS.map(({ id }) => id).join(", ")}.`);
      }
      return {
        default_provider: "exa",
        providers: roster.map((adapter) => ({
          id: adapter.id,
          description: adapter.description,
          strengths: adapter.strengths,
          settings: adapter.settings.map((setting) => ({
            name: setting.name,
            kind: setting.kind,
            description: setting.description,
            ...(setting.kind === "enum" ? { values: [...setting.values] } : {}),
            ...(setting.kind === "integer" ? { min: setting.min, max: setting.max } : {}),
          })),
          adapter_revision: adapter.revision,
          verified_at: adapter.verifiedAt,
        })),
      };
    },
    toModelOutput(output) {
      return {
        type: "text",
        value: output.providers
          .map((provider) => {
            const settings = provider.settings
              .map((setting) => (setting.values === undefined ? setting.name : `${setting.name} (${setting.values.join("|")})`))
              .join(", ");
            return `${provider.id}${provider.id === output.default_provider ? " (default)" : ""}: ${provider.strengths} Settings: ${settings}.`;
          })
          .join("\n"),
      };
    },
  });
}

export default searchProvidersTool();
