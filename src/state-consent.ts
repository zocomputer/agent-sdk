// `@zo/state` consent surface (bead zo-oxg.27.3): the D2 trust-consent tool + the
// handle wrappers that turn a `consent_required` gate into a model-facing steer.
// One entry point (`@zocomputer/agent-sdk/state-consent`) for the template and any
// runtime code wiring consent-aware state access.

export { createRequestStateConsentTool } from "./state-consent-tool";

export {
  parseConsentEnvelope,
  requestStateConsentInputSchema,
  consentPartySchema,
  REQUEST_STATE_CONSENT_TOOL_NAME,
  type RequestStateConsentInput,
  type StateConsentEnvelope,
} from "./state-consent-envelope";

export {
  buildConsentSteer,
  requestStateFilesHandleWithConsent,
  requestStateSandboxHandleWithConsent,
  type StateHandleOutcome,
} from "./state-consent-wrapper";
