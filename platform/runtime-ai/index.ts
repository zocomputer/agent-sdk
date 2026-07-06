export {
  DEFAULT_ZO_AI_BASE_URL,
  DEFAULT_ZO_AI_KEY,
  ZO_TOOL_HEADER,
  resolveZoGatewayApiKey,
  resolveZoGatewayBaseUrl,
  zoGateway,
} from "./gateway";
export type { ZoGatewayOptions } from "./gateway";
export {
  EVE_SESSION_HEADER,
  EVE_TURN_HEADER,
  ambientEveSessionId,
  ambientEveTurnId,
  eveSessionFetch,
} from "./session-fetch";

// `./register` is deliberately NOT re-exported here: it's a side-effect module
// (import it for what it does, not for a value), and a barrel re-export would
// run the registration on any value import from this package.
