import {
  requestStateFilesHandle,
  StateFilesHandleError,
  type RequestStateFilesHandleOptions,
  type StateFilesHandle,
} from "./state-files";
import {
  requestStateSandboxHandle,
  StateSandboxHandleError,
  type RequestStateSandboxHandleOptions,
  type StateSandboxHandle,
} from "./state-sandbox";
import {
  REQUEST_STATE_CONSENT_TOOL_NAME,
  type StateConsentEnvelope,
} from "./state-consent-envelope";

// The `@zo/state` consent wrapper (bead zo-oxg.27.3). The raw handle clients
// THROW a typed `consent_required` on a pending trust gate; a thrown error just
// fails the model's turn. This wraps them so a `consent_required` becomes a
// MODEL-FACING steer instead: the state op returns a result telling the model to
// call `request_state_consent` with the exact envelope the broker returned. That
// call parks on the approval rail; the consumer's Allow grants the binding and
// resumes the turn (bead zo-oxg.27.6), and the model retries. Every OTHER failure
// still throws — only the consent gate is a steer, never a swallow.

/** The outcome of a consent-aware handle request: the handle, or a consent steer. */
export type StateHandleOutcome<THandle> =
  | { readonly kind: "handle"; readonly handle: THandle }
  | {
      readonly kind: "consent_required";
      /** The model-facing instruction to render as the tool result. */
      readonly steer: string;
      /** The envelope to pass verbatim to `request_state_consent`. */
      readonly envelope: StateConsentEnvelope;
    };

/**
 * The model-facing instruction returned when a capability needs consent. Names
 * the tool and embeds the exact args so the model can't fabricate them — the
 * envelope must round-trip unchanged to chat-core's `parseConsentToolInput`.
 */
export function buildConsentSteer(envelope: StateConsentEnvelope): string {
  return [
    `Using "${envelope.resourceName}" needs the user's consent first.`,
    `Call the \`${REQUEST_STATE_CONSENT_TOOL_NAME}\` tool with exactly these values (do not change or invent them):`,
    JSON.stringify(envelope),
    `The user will be asked to Allow or Deny. On Allow, the capability is granted — retry your original operation. On Deny, do not retry; tell the user you can't proceed without access.`,
  ].join("\n");
}

/**
 * Request a state-FILES handle, turning a `consent_required` gate into a steer.
 * Re-throws every other `StateFilesHandleError` (and any non-consent error) — a
 * broken broker is a real failure, not a consent prompt. A `consent_required`
 * whose 409 lacked a parseable envelope also re-throws: without the envelope the
 * model has nothing valid to pass, so surfacing the raw error beats a steer the
 * model can't act on.
 */
export async function requestStateFilesHandleWithConsent(
  options: RequestStateFilesHandleOptions,
): Promise<StateHandleOutcome<StateFilesHandle>> {
  try {
    return { kind: "handle", handle: await requestStateFilesHandle(options) };
  } catch (error) {
    if (error instanceof StateFilesHandleError && error.code === "consent_required" && error.consent) {
      return { kind: "consent_required", steer: buildConsentSteer(error.consent), envelope: error.consent };
    }
    throw error;
  }
}

/** Request a state-SANDBOX handle, turning a `consent_required` gate into a steer. Same contract as the files variant. */
export async function requestStateSandboxHandleWithConsent(
  options: RequestStateSandboxHandleOptions,
): Promise<StateHandleOutcome<StateSandboxHandle>> {
  try {
    return { kind: "handle", handle: await requestStateSandboxHandle(options) };
  } catch (error) {
    if (error instanceof StateSandboxHandleError && error.code === "consent_required" && error.consent) {
      return { kind: "consent_required", steer: buildConsentSteer(error.consent), envelope: error.consent };
    }
    throw error;
  }
}
