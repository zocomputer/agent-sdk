import { z } from "zod";

// The pure consent-envelope contract: the wire name, the zod schema, and the
// parser. Deliberately eve-free (only `zod`) so the low-level state HTTP clients
// (`state-files.ts`, `state-sandbox.ts`) and the consent wrapper can read the
// envelope off a `consent_required` 409 WITHOUT pulling eve's tool runtime. The
// eve-coupled tool (`state-consent-tool.ts`, which imports `eve/tools`) also
// depends on this module — so both the client and the tool share one contract,
// and neither drags the other's dependencies. See the plan
// `plans/dcosson/state-consent-runtime-tool-research.md`.

/**
 * The wire name the state capability bundles. Defined here (agent-sdk has no
 * chat-core dependency) and MUST equal chat-core's `REQUEST_STATE_CONSENT_TOOL_NAME`
 * so the consent projection keys on the same string. The authored template file
 * (`agent/tools/request_state_consent.ts`) carries this name via its filename.
 */
export const REQUEST_STATE_CONSENT_TOOL_NAME = "request_state_consent";

/** The trust attribution rendered on the consent card — server-derived from the agent's author. */
export const consentPartySchema = z.object({
  handle: z.string().min(1),
  external: z.boolean(),
  intentDivergenceNote: z.string().min(1).optional(),
});

/**
 * The consent envelope the model passes through — structurally the input
 * chat-core's `parseConsentToolInput` validates on the client. `bindingId` is the
 * concrete `StateBinding` the Allow grants (the authenticated target for
 * `POST /state/bindings/:bindingId/grant`); the rest render the card.
 */
export const requestStateConsentInputSchema = z.object({
  bindingId: z.string().min(1),
  declarationName: z.string().min(1),
  resourceName: z.string().min(1),
  party: consentPartySchema,
});

export type RequestStateConsentInput = z.infer<typeof requestStateConsentInputSchema>;

/** The consent envelope carried on a `consent_required` state error and passed
 * through the tool — the single shape shared by the broker 409, the wrapper
 * steer, and the tool input. */
export type StateConsentEnvelope = RequestStateConsentInput;

/**
 * Parse an untrusted value (a broker 409 body's consent fields) into a typed
 * envelope, or `null` if malformed — parse-don't-validate at the wire boundary,
 * the same contract chat-core's `parseConsentToolInput` enforces client-side.
 */
export function parseConsentEnvelope(value: unknown): StateConsentEnvelope | null {
  const result = requestStateConsentInputSchema.safeParse(value);
  return result.success ? result.data : null;
}
