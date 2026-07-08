import { z } from "zod";

// The consent-envelope contract, mirrored for the cloud-tools runtime state path
// (bead zo-oxg.27.10). The CANONICAL definition is
// `packages/agent-sdk/src/state-consent-envelope.ts`; this is a deliberate copy,
// NOT an import, because `@zocomputer/cloud-tools` is composed INTO the published
// agent-sdk mirror (see `scripts/sync-agent-sdk.ts`) — importing
// `@zocomputer/agent-sdk` from here would be circular in the composed package and
// has no import-rewrite rule. The shape is small and stable; it's pinned on the
// far side by chat-core's `parseConsentToolInput`, and the same "MUST equal"
// discipline the canonical module already keeps against chat-core applies here.
// Keep the field set, the tool name, and the steer text in sync with the
// canonical module. Deliberately eve-free (only `zod`) so the low-level state
// HTTP client can read the envelope off a `consent_required` 409.

/**
 * The wire name the state capability bundles. MUST equal chat-core's
 * `REQUEST_STATE_CONSENT_TOOL_NAME` and the agent-sdk canonical constant so the
 * consent projection keys on the same string.
 */
export const REQUEST_STATE_CONSENT_TOOL_NAME = "request_state_consent";

/** The trust attribution rendered on the consent card — server-derived from the agent's author. */
const consentPartySchema = z.object({
  handle: z.string().min(1),
  external: z.boolean(),
  intentDivergenceNote: z.string().min(1).optional(),
});

/**
 * The consent envelope carried on a `consent_required` 409 and passed through
 * `request_state_consent`. `bindingId` is the `StateBinding` the consumer's Allow
 * grants (the target for `POST /state/bindings/:bindingId/grant`); the rest render
 * the card. Structurally identical to chat-core's `parseConsentToolInput` input.
 */
const consentEnvelopeSchema = z.object({
  bindingId: z.string().min(1),
  declarationName: z.string().min(1),
  resourceName: z.string().min(1),
  party: consentPartySchema,
});

/** The validated consent envelope — the shape shared by the broker 409, the steer, and the tool input. */
export type ConsentEnvelope = z.infer<typeof consentEnvelopeSchema>;

/**
 * Parse an untrusted value (a broker 409 body) into a typed consent envelope, or
 * `null` if malformed — parse-don't-validate at the wire boundary. Extra fields
 * on the body (`error`, `storeId`) are ignored.
 */
export function parseConsentEnvelope(value: unknown): ConsentEnvelope | null {
  const result = consentEnvelopeSchema.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * The model-facing instruction returned when a state op needs consent. Names the
 * tool and embeds the exact envelope JSON so the model can't fabricate the args —
 * the envelope must round-trip unchanged to chat-core's `parseConsentToolInput`.
 * Mirrors the agent-sdk canonical `buildConsentSteer`.
 */
export function buildConsentSteer(envelope: ConsentEnvelope): string {
  return [
    `Using "${envelope.resourceName}" needs the user's consent first.`,
    `Call the \`${REQUEST_STATE_CONSENT_TOOL_NAME}\` tool with exactly these values (do not change or invent them):`,
    JSON.stringify(envelope),
    `The user will be asked to Allow or Deny. On Allow, the capability is granted — retry your original operation. On Deny, do not retry; tell the user you can't proceed without access.`,
  ].join("\n");
}
