import { describe, expect, test } from "bun:test";
import consentEnvelopeFixture from "../../fixtures/consent-envelope.fixture.json" with { type: "json" };

import { buildConsentSteer, parseConsentEnvelope, REQUEST_STATE_CONSENT_TOOL_NAME } from "./state-consent";

describe("parseConsentEnvelope", () => {
  test("parses the shared golden envelope with and without intentDivergenceNote", () => {
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

describe("buildConsentSteer", () => {
  test("names the tool and embeds the exact envelope JSON", () => {
    const steer = buildConsentSteer(consentEnvelopeFixture.valid);
    expect(steer).toBe(consentEnvelopeFixture.expectedConsentSteer);
    expect(steer).toContain(REQUEST_STATE_CONSENT_TOOL_NAME);
    expect(steer).toContain(consentEnvelopeFixture.valid.resourceName);
    // The envelope must round-trip unchanged — the model passes it verbatim to
    // request_state_consent, and chat-core re-validates the same shape.
    expect(steer).toContain(JSON.stringify(consentEnvelopeFixture.valid));
  });

  test("the embedded JSON re-parses to the same envelope", () => {
    const steer = buildConsentSteer(consentEnvelopeFixture.valid);
    const jsonLine = steer.split("\n").find((line) => line.trimStart().startsWith("{"));
    expect(jsonLine).toBeDefined();
    expect(parseConsentEnvelope(JSON.parse(jsonLine ?? "null"))).toEqual(consentEnvelopeFixture.valid);
  });
});
