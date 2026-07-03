// The delivery half of steering: wrap a tool so that when its execute
// resolves, any steered messages queued for the session ride out on the
// result — the model reads them before its next inference step (eve has no
// pre-inference injection; see ./steer.ts). Two seams per tool:
//
// - `execute`: after the original resolves, drain the session's inbox and
//   attach the messages to the raw output (UI clients read them off
//   `action.result` events). Only successful results participate — a thrown
//   error is eve-owned and can't carry fields.
// - `toModelOutput`: a tool's own projection narrows the raw result, which
//   would silently drop the attached field (read strips unknown keys, for
//   example). The wrapper strips the steer, delegates to the original
//   projection, then re-merges — text outputs get the rendered block
//   appended, json outputs get the field re-attached.
//
// eve's defineTool brands the definition object, so the wrapper re-stamps a
// copy instead of mutating the original.

import { defineTool, type ToolDefinition, type ToolModelOutput } from "eve/tools";
import {
  attachSteerToOutput,
  mergeSteerIntoModelOutput,
  readSteerMessages,
  stripSteerFromOutput,
} from "./steer";
import type { SteerInbox } from "./steer-inbox";

/** The drain-side subset of the inbox the wrapper needs. */
export type SteerSource = Pick<SteerInbox, "drain">;

/**
 * Wrap one tool with steer delivery. Structurally output-preserving for
 * record outputs (the steer field spreads in alongside the tool's own keys);
 * a non-record output is wrapped when steers are pending, which the
 * `toModelOutput` seam undoes before the tool's own projection runs.
 */
export function withSteerDelivery<TInput, TOutput>(
  tool: ToolDefinition<TInput, TOutput>,
  inbox: SteerSource,
): ToolDefinition<TInput, TOutput> {
  const originalToModelOutput = tool.toModelOutput?.bind(tool);

  const wrapped: ToolDefinition<TInput, TOutput> = {
    ...tool,
    async execute(input, ctx) {
      const output = await tool.execute(input, ctx);
      const messages = inbox.drain(ctx.session.id);
      if (messages.length === 0) return output;
      // The one type-level concession: an attached record output is TOutput
      // plus the steer field; a non-record output becomes the recoverable
      // wrapper shape. eve treats tool outputs as unknown on the wire, and
      // the toModelOutput wrapper below recovers the original before the
      // tool's own projection sees it.
      return attachSteerToOutput(output, messages) as TOutput;
    },
    ...(originalToModelOutput
      ? {
          async toModelOutput(output: TOutput): Promise<ToolModelOutput> {
            const messages = readSteerMessages(output);
            if (!messages) return originalToModelOutput(output);
            const original = stripSteerFromOutput(
              // readSteerMessages returning non-null proves output is a record.
              output as Record<string, unknown>,
            ) as TOutput;
            const narrowed = await originalToModelOutput(original);
            return mergeSteerIntoModelOutput(narrowed, messages);
          },
        }
      : {}),
  };
  return defineTool(wrapped);
}

/**
 * A conditional wrapper for wiring call sites: identity when no inbox is
 * configured, `withSteerDelivery` otherwise.
 */
export function createSteerWrapper(
  inbox: SteerSource | null,
): <TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>) => ToolDefinition<TInput, TOutput> {
  if (!inbox) return (tool) => tool;
  return (tool) => withSteerDelivery(tool, inbox);
}
