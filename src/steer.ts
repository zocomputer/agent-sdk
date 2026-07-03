// The steer contract: pure types and helpers for delivering a user's
// mid-turn messages to the model as soon as possible. eve has no
// pre-inference injection — hooks are observe-only for model context, and
// send() rejects while a turn is running — so a steered message rides the
// next completing tool result instead (./steer-tool.ts attaches it under
// STEER_FIELD), with leftovers a turn ends before delivering going out on
// park (./hooks.ts). Dependency-free and exported at the
// `@zocomputer/agent-sdk/steer` subpath so UI clients (which write the inbox
// and read `user_steer` off `action.result` events) consume it without the
// extraction deps.

/** Result key carrying steered messages on a tool output. */
export const STEER_FIELD = "user_steer";

/** Key the original output hides under when it isn't a record. */
export const STEER_WRAPPED_OUTPUT_FIELD = "steer_wrapped_output";

/** Conventional inbox dirname under an agent's state dir. */
export const STEER_DIRNAME = "steer";

/** The note the model reads alongside steered messages. */
export const STEER_NOTE =
  "The user sent these messages while this tool was running. They take priority: address them now and adjust your current approach before continuing.";

/** One steered message, as queued by a UI and delivered to the model. */
export interface SteerMessage {
  /** Unique id — the park-delivery dedupe key (`steer:<id>`). */
  id: string;
  /** The user's message, verbatim. */
  text: string;
  /** Queue time (epoch ms). */
  at: number;
}

/** What rides under STEER_FIELD on a tool output. */
export interface SteerPayload {
  note: string;
  messages: SteerMessage[];
}

export function buildSteerPayload(messages: readonly SteerMessage[]): SteerPayload {
  return { note: STEER_NOTE, messages: [...messages] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSteerMessage(value: unknown): value is SteerMessage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    typeof value.at === "number"
  );
}

/**
 * Attach steered messages to a tool output. A record output keeps its own
 * keys with the payload spread in alongside (merging with any messages a
 * previous attach already carried); a non-record output is wrapped so
 * `stripSteerFromOutput` can recover it exactly.
 */
export function attachSteerToOutput(
  output: unknown,
  messages: readonly SteerMessage[],
): Record<string, unknown> {
  if (isRecord(output)) {
    const existing = readSteerMessages(output) ?? [];
    return { ...output, [STEER_FIELD]: buildSteerPayload([...existing, ...messages]) };
  }
  return {
    [STEER_WRAPPED_OUTPUT_FIELD]: output,
    [STEER_FIELD]: buildSteerPayload(messages),
  };
}

/**
 * Inverse of `attachSteerToOutput`: drop the steer field and unwrap a
 * non-record original. Only unwraps when the wrapper key is the sole
 * remaining key, so a record that legitimately contains it survives.
 */
export function stripSteerFromOutput(record: Record<string, unknown>): unknown {
  const { [STEER_FIELD]: _steer, ...rest } = record;
  const keys = Object.keys(rest);
  if (keys.length === 1 && keys[0] === STEER_WRAPPED_OUTPUT_FIELD) {
    return rest[STEER_WRAPPED_OUTPUT_FIELD];
  }
  return rest;
}

/**
 * Read the steered messages off a tool output, structurally validated.
 * Returns null when the output isn't a record, carries no steer payload, or
 * the payload holds no well-formed message; malformed entries are dropped.
 */
export function readSteerMessages(output: unknown): SteerMessage[] | null {
  if (!isRecord(output)) return null;
  const payload = output[STEER_FIELD];
  if (!isRecord(payload) || !Array.isArray(payload.messages)) return null;
  const messages = payload.messages.filter(isSteerMessage);
  return messages.length > 0 ? messages : null;
}

/** Render steered messages as a text block (for text-mode model outputs). */
export function formatSteerText(messages: readonly SteerMessage[]): string {
  const lines = messages.map((message) => `- ${message.text}`);
  return `[${STEER_FIELD}] ${STEER_NOTE}\n${lines.join("\n")}`;
}

/** The shape eve's `toModelOutput` produces — mirrored here to stay dependency-free. */
export type SteerModelOutput =
  | { type: "text"; value: string }
  | { type: "json"; value: unknown };

/**
 * Merge steered messages into a tool's already-narrowed model output: text
 * outputs get the rendered block appended, json outputs get the field
 * re-attached.
 */
export function mergeSteerIntoModelOutput(
  output: SteerModelOutput,
  messages: readonly SteerMessage[],
): SteerModelOutput {
  if (output.type === "text") {
    return { type: "text", value: `${output.value}\n\n${formatSteerText(messages)}` };
  }
  return { type: "json", value: attachSteerToOutput(output.value, messages) };
}

/** Serialize one message as an NDJSON line (no trailing newline). */
export function serializeSteerLine(message: SteerMessage): string {
  return JSON.stringify(message);
}

/** Parse one NDJSON line; null on blank or malformed input. */
export function parseSteerLine(line: string): SteerMessage | null {
  const trimmed = line.trim();
  if (trimmed === "") return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return isSteerMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
