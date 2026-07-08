import { describe, expect, test } from "bun:test";
import { parseConsentEnvelope, REQUEST_STATE_CONSENT_TOOL_NAME } from "./state-consent-envelope";

// A well-formed consent envelope, matching chat-core's `parseConsentToolInput`
// contract (bindingId, declarationName, resourceName, party{handle, external,
// intentDivergenceNote?}).
const ENVELOPE = {
  bindingId: "stb_abc123",
  declarationName: "team-notes",
  resourceName: "Team notes",
  party: { handle: "acme", external: false },
};

describe("state-consent envelope contract", () => {
  test("the wire name matches the chat-core contract constant", () => {
    expect(REQUEST_STATE_CONSENT_TOOL_NAME).toBe("request_state_consent");
  });

  test("accepts a well-formed envelope", () => {
    expect(parseConsentEnvelope(ENVELOPE)).toEqual(ENVELOPE);
  });

  test("accepts an optional intentDivergenceNote", () => {
    const withNote = { ...ENVELOPE, party: { ...ENVELOPE.party, intentDivergenceNote: "heads up" } };
    expect(parseConsentEnvelope(withNote)).toEqual(withNote);
  });

  test("rejects a missing bindingId (the grant target)", () => {
    const { bindingId: _omit, ...noBinding } = ENVELOPE;
    expect(parseConsentEnvelope(noBinding)).toBeNull();
  });

  test("rejects a party missing external", () => {
    const badParty = { ...ENVELOPE, party: { handle: "acme" } };
    expect(parseConsentEnvelope(badParty)).toBeNull();
  });
});
