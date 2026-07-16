import { z } from "zod";

import { StateFilesConsentError } from "./state-files";

// Shared pieces of the media-generating tools (image, video): the state_asset
// output envelope, warning normalization, and the failure→model-feedback
// mapping. One module so the two tools can't drift.

/**
 * The `state_asset` reference envelope in tool output — the wire contract
 * chat-core's `state-asset-parts.ts` parses to render generated assets.
 * CamelCase keys are deliberate: this is a UI-facing output shape, never
 * echoed back into any tool param.
 */
export const StateAssetReferenceSchema = z.object({
  bytes: z.number().int().nonnegative().optional(),
  contentType: z.string().optional(),
  declarationName: z.string(),
  integrity: z.string().min(1),
  path: z.string(),
  type: z.literal("state_asset"),
});

/** The output shape both media-generating tools return: the asset reference plus generation metadata. */
export const GeneratedAssetOutputSchema = z.object({
  asset: StateAssetReferenceSchema,
  bytes: z.number().int().nonnegative(),
  mediaType: z.string(),
  model: z.string(),
  path: z.string(),
  prompt: z.string(),
  warnings: z.array(z.string()),
});

/**
 * A generation warning rendered as a plain string for the tool result,
 * bounded like error detail (warnings ride the result into the transcript).
 */
export function warningText(warning: unknown): string {
  return errorDetail(warning);
}

/**
 * Cap on the upstream error detail interpolated into a tool failure. A
 * provider/gateway failure can carry a whole HTML error page or a huge JSON
 * blob; the tool error enters the transcript permanently, so the detail is
 * truncated — the useful part (status, provider reason) lives in the head.
 * Same posture as the Builder's deploy-error body cap.
 */
export const ERROR_DETAIL_MAX_CHARS = 2000;

function errorDetail(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : // The lib overload says `JSON.stringify` returns `string`, but it
          // really returns `undefined` for symbols/functions — widen it back.
          ((JSON.stringify(error) as string | undefined) ?? String(error));
  if (raw.length <= ERROR_DETAIL_MAX_CHARS) return raw;
  return `${raw.slice(0, ERROR_DETAIL_MAX_CHARS)} … [truncated]`;
}

/**
 * Map a failed generation call (the gateway `generateImage`/`generateVideo`
 * request) to model-actionable feedback: nothing was generated, here's why,
 * here's the next move. The upstream error's message is kept — it usually
 * carries the status or provider reason — but never a raw stack or JSON blob.
 */
export function generationFailure(kind: "image" | "video", error: unknown): Error {
  return new Error(
    `No ${kind} was generated — the generation call failed: ${errorDetail(error)}. ` +
      `If this looks transient (rate limit, timeout, server error), retry the call; ` +
      `if it names the model, fix the \`model\` input or omit it to use the default. ` +
      `If it keeps failing, report the reason to the user instead of retrying further.`,
  );
}

/**
 * Map a failed state-asset write to model-actionable feedback. A
 * {@link StateFilesConsentError} passes through untouched — its message IS the
 * consent steer the model must read verbatim (it names
 * `request_state_consent` and carries the envelope).
 */
export function saveFailure(kind: "image" | "video", error: unknown): Error {
  if (error instanceof StateFilesConsentError) return error;
  return new Error(
    `The ${kind} was generated but no state asset was saved — ${errorDetail(error)}. ` +
      `Nothing is available to the chat. If the reason looks transient (a storage ` +
      `write failure), retry the call once; if it's a configuration problem, report ` +
      `it to the user instead of retrying.`,
  );
}
