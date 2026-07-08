import { describe, expect, test } from "bun:test";

import {
  buildConsentSteer,
  parseConsentEnvelope,
  REQUEST_STATE_CONSENT_TOOL_NAME,
  type ConsentEnvelope,
} from "./state-consent";

const ENVELOPE: ConsentEnvelope = {
  bindingId: "stb_abc123",
  declarationName: "notes",
  resourceName: "Notes",
  party: { handle: "org_acme", external: false },
};

describe("parseConsentEnvelope", () => {
  test("parses a well-formed consent_required 409 body", () => {
    // The broker 409 body carries extra fields (`error`, `storeId`) the envelope
    // ignores — parsing off the whole body must still succeed.
    const body = {
      error: "consent_required",
      declarationName: "notes",
      storeId: "sts_xyz",
      bindingId: "stb_abc123",
      resourceName: "Notes",
      party: { handle: "org_acme", external: false },
    };
    expect(parseConsentEnvelope(body)).toEqual(ENVELOPE);
  });

  test("keeps an optional intentDivergenceNote", () => {
    const body = { ...ENVELOPE, party: { handle: "org_acme", external: true, intentDivergenceNote: "wants more than declared" } };
    const parsed = parseConsentEnvelope(body);
    expect(parsed?.party.intentDivergenceNote).toBe("wants more than declared");
    expect(parsed?.party.external).toBe(true);
  });

  test("returns null when bindingId is missing", () => {
    const { bindingId: _omit, ...rest } = ENVELOPE;
    expect(parseConsentEnvelope(rest)).toBeNull();
  });

  test("returns null when party is missing", () => {
    const { party: _omit, ...rest } = ENVELOPE;
    expect(parseConsentEnvelope(rest)).toBeNull();
  });

  test("returns null when party.external is the wrong type", () => {
    const body = { ...ENVELOPE, party: { handle: "org_acme", external: "no" } };
    expect(parseConsentEnvelope(body)).toBeNull();
  });

  test("returns null for a non-object", () => {
    expect(parseConsentEnvelope(null)).toBeNull();
    expect(parseConsentEnvelope("consent_required")).toBeNull();
    expect(parseConsentEnvelope(42)).toBeNull();
  });
});

describe("buildConsentSteer", () => {
  test("names the tool and embeds the exact envelope JSON", () => {
    const steer = buildConsentSteer(ENVELOPE);
    expect(steer).toContain(REQUEST_STATE_CONSENT_TOOL_NAME);
    expect(steer).toContain(ENVELOPE.resourceName);
    // The envelope must round-trip unchanged — the model passes it verbatim to
    // request_state_consent, and chat-core re-validates the same shape.
    expect(steer).toContain(JSON.stringify(ENVELOPE));
  });

  test("the embedded JSON re-parses to the same envelope", () => {
    const steer = buildConsentSteer(ENVELOPE);
    const jsonLine = steer.split("\n").find((line) => line.trimStart().startsWith("{"));
    expect(jsonLine).toBeDefined();
    expect(parseConsentEnvelope(JSON.parse(jsonLine ?? "null"))).toEqual(ENVELOPE);
  });
});
