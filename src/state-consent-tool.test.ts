import { describe, expect, test } from "bun:test";
import { REQUEST_STATE_CONSENT_TOOL_NAME } from "./state-consent-envelope";
import { createRequestStateConsentTool } from "./state-consent-tool";

// A well-formed consent envelope, matching chat-core's `parseConsentToolInput`
// contract (bindingId, declarationName, resourceName, party{handle, external,
// intentDivergenceNote?}).
const ENVELOPE = {
  bindingId: "stb_abc123",
  declarationName: "team-notes",
  resourceName: "Team notes",
  party: { handle: "acme", external: false },
};

describe("createRequestStateConsentTool", () => {
  test("parks on the approval rail — approval always requires user approval", () => {
    const tool = createRequestStateConsentTool();
    // The tool DOES have an execute (eve requires it) but gates behind a
    // `user-approval` so the call parks as a durable input request instead of
    // running unattended — the approval rail this v1 rides.
    expect(tool.approval).toBeDefined();
    const decision = tool.approval?.({
      // The approval callback ignores its context for the always-park case.
      approvedTools: new Set<string>(),
      toolName: REQUEST_STATE_CONSENT_TOOL_NAME,
      input: ENVELOPE,
    } as never);
    expect(decision).toBe("user-approval");
  });

  test("execute (runs only after Allow) steers the model to retry the state op", async () => {
    const tool = createRequestStateConsentTool();
    const out = await tool.execute(ENVELOPE, {} as never);
    // The client-side decision handler (bead zo-oxg.27.6) grants the binding
    // BEFORE resolving the approval, so by the time execute runs the binding is
    // active — the tool tells the model the consent flow completed and to retry.
    expect(typeof out).toBe("string");
    expect(out).toContain("team-notes");
    expect(String(out).toLowerCase()).toContain("retry");
  });
});
