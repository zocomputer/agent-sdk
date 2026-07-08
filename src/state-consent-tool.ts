import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import {
  requestStateConsentInputSchema,
  type RequestStateConsentInput,
} from "./state-consent-envelope";

// The D2 trust-consent tool (plan `plans/misc-fog/agent-adoption-ux.md`, D2.4;
// `plans/dcosson/state-consent-runtime-tool-research.md`). When a state handle
// resolves `consent_required`, the `@zo/state` wrapper steers the model to call
// THIS tool with the consent envelope; the call parks on eve's approval rail
// (`approval: () => "user-approval"` → a durable input request, like
// `ask_question`, NOT a fatal blocking poll — see the research doc's approval-rail
// finding). The consumer's Allow grants the binding client-side (bead
// `zo-oxg.27.6`) and then resolves the approval, so by the time `execute` runs the
// binding is active and the model is told to retry.
//
// This module is the eve-COUPLED half of the consent surface (it imports
// `eve/tools`); the pure envelope contract (schema/type/parser) lives in the
// eve-free `state-consent-envelope.ts` so the low-level state clients can read a
// 409 envelope without dragging in eve's tool runtime.
//
// v1 is the no-eve-change path Danny green-lit. Two known deltas remain for an
// eve-core follow-up: the tool is builder-REMOVABLE (authored, not framework),
// and it parks eve's GENERIC approve/deny confirmation rather than the dedicated
// `request_state_consent`-shaped card (chat-core `consent-parts.ts` projects the
// card when its `toolMetadata.eve.inputRequest` keys line up).

/**
 * Build the `request_state_consent` tool. The template re-exports this from
 * `agent/tools/request_state_consent.ts` so the filename fixes the wire name.
 */
export function createRequestStateConsentTool() {
  return defineTool({
    description:
      "Request the consumer's consent before using an external-state capability that " +
      "resolved `consent_required`. Call this with the exact envelope the state error " +
      "returned (bindingId, declarationName, resourceName, party). The consumer is asked " +
      "to Allow or Deny; on Allow the capability is granted and you should retry the " +
      "original state operation. Do not fabricate the envelope — use the one the state " +
      "tool gave you.",
    inputSchema: requestStateConsentInputSchema,
    execute: (input: RequestStateConsentInput): string => {
      // Reached only after the consumer Allowed (the approval rail rejects the
      // call on Deny, so `execute` never runs then). The client decision handler
      // (bead zo-oxg.27.6) grants the binding BEFORE resolving the approval, so
      // the capability is now active — steer the model back to its state op.
      return (
        `Consent granted for "${input.declarationName}". The capability is now active — ` +
        `retry your original state operation and it will succeed.`
      );
    },
    // The approval rail: every call parks as a durable user-approval input
    // request. This is the whole mechanism — a blocking execute that polled the
    // grant API would hold the serverless turn open past its timeout (research
    // doc); parking suspends the turn and resumes on the consumer's decision.
    approval: always<RequestStateConsentInput>(),
  });
}
