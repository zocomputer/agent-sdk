import { createGateway } from "ai";
import { zoGatewaySettings, type ZoGatewayOptions } from "./gateway-config";

// The proxy-pointed gateway client. All settings (env-default resolvers,
// agent-token attribution header, guarded session-stamping fetch) live in
// `gateway-config.ts`, which stays free of runtime `ai` imports so workspace
// consumers can inline it into an agent.ts bundle — this module only adds the
// `createGateway` call.
export {
  agentAuthHeaders,
  DEFAULT_ZO_AI_BASE_URL,
  DEFAULT_ZO_AI_KEY,
  resolveZoGatewayApiKey,
  resolveZoGatewayBaseUrl,
  ZO_TOOL_HEADER,
  zoGatewaySettings,
} from "./gateway-config";
export type { ZoGatewayOptions } from "./gateway-config";

// Explicit return type: the inferred one names @ai-sdk/gateway's GatewayProvider
// through a store-internal path, which the d.ts build rejects as non-portable.
export function zoGateway(
  options: ZoGatewayOptions = {},
): ReturnType<typeof createGateway> {
  return createGateway(zoGatewaySettings(options));
}
