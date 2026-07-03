import { zoGateway } from "../runtime-ai/index.ts";

type Gateway = ReturnType<typeof zoGateway>;
type ExaSearchFactory = Gateway["tools"]["exaSearch"];

export type WebSearchConfig = Parameters<ExaSearchFactory>[0];

export function webSearch(config?: WebSearchConfig): ReturnType<ExaSearchFactory> {
  const gateway = zoGateway();
  return config === undefined
    ? gateway.tools.exaSearch()
    : gateway.tools.exaSearch(config);
}

export default webSearch;
