import { describe, expect, test } from "bun:test";
import consentEnvelopeFixture from "../../fixtures/consent-envelope.fixture.json" with { type: "json" };
import { parseConsentEnvelope, REQUEST_STATE_CONSENT_TOOL_NAME } from "./state-consent-envelope";

describe("state-consent envelope contract", () => {
  test("the wire name matches the chat-core contract constant", () => {
    expect(REQUEST_STATE_CONSENT_TOOL_NAME).toBe("request_state_consent");
  });

  test("accepts the shared golden envelope with and without intentDivergenceNote", () => {
    expect(parseConsentEnvelope(consentEnvelopeFixture.valid)).toEqual(consentEnvelopeFixture.valid);
    expect(parseConsentEnvelope(consentEnvelopeFixture.validWithoutNote)).toEqual(consentEnvelopeFixture.validWithoutNote);
  });

  test("parses the envelope off a broker body with extra fields", () => {
    expect(parseConsentEnvelope(consentEnvelopeFixture.validWithExtraBrokerFields)).toEqual(consentEnvelopeFixture.valid);
  });

  test.each(consentEnvelopeFixture.invalid.map(({ name, input }) => [name, input] as const))(
    "rejects the shared invalid fixture: %s",
    (_name, input) => {
      expect(parseConsentEnvelope(input)).toBeNull();
    },
  );
});
