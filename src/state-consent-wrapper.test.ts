import { describe, expect, test } from "bun:test";
import consentEnvelopeFixture from "../../fixtures/consent-envelope.fixture.json" with { type: "json" };
import type { RequestStateFilesHandleOptions } from "./state-files";
import {
  buildConsentSteer,
  requestStateFilesHandleWithConsent,
} from "./state-consent-wrapper";

const ENVELOPE = consentEnvelopeFixture.valid;

// A valid handle body the broker returns on 200 (mirrors state-files.test.ts).
const HANDLE_BODY = {
  handleId: "hnd_123",
  declarationName: "team-notes",
  interface: "files",
  access: "rw",
  engine: "zo-blob-r2",
  storeId: "sto_1",
  stateInstanceId: "sti_1",
  partition: "team",
  bucketName: "bucket-notes",
  endpoint: "https://example.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "AKIA",
    secretAccessKey: "secret",
    sessionToken: "token",
    expiresAt: "2026-07-08T00:00:00.000Z",
  },
};

function optionsWith(fetch: RequestStateFilesHandleOptions["fetch"]): RequestStateFilesHandleOptions {
  return {
    fetch,
    apiBaseUrl: "https://api.zo.test",
    declarationName: "team-notes",
    access: "rw",
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("buildConsentSteer", () => {
  test("names the tool and embeds the exact envelope", () => {
    const steer = buildConsentSteer(ENVELOPE);
    expect(steer).toBe(consentEnvelopeFixture.expectedConsentSteer);
    expect(steer).toContain("request_state_consent");
    expect(steer).toContain(ENVELOPE.resourceName);
    // The envelope round-trips verbatim so the model passes it unchanged.
    expect(steer).toContain(JSON.stringify(ENVELOPE));
  });
});

describe("requestStateFilesHandleWithConsent", () => {
  test("returns the handle on success", async () => {
    const outcome = await requestStateFilesHandleWithConsent(
      optionsWith(() => Promise.resolve(jsonResponse(200, HANDLE_BODY))),
    );
    expect(outcome.kind).toBe("handle");
    if (outcome.kind === "handle") {
      expect(outcome.handle.handleId).toBe("hnd_123");
    }
  });

  test("a consent_required 409 with an envelope becomes a steer, not a throw", async () => {
    const body = { error: "consent_required", ...ENVELOPE, storeId: "sto_1" };
    const outcome = await requestStateFilesHandleWithConsent(
      optionsWith(() => Promise.resolve(jsonResponse(409, body))),
    );
    expect(outcome.kind).toBe("consent_required");
    if (outcome.kind === "consent_required") {
      expect(outcome.envelope).toEqual(ENVELOPE);
      expect(outcome.steer).toContain("request_state_consent");
    }
  });

  test("a consent_required 409 WITHOUT a parseable envelope re-throws", async () => {
    // Missing bindingId/party — the model would have nothing valid to pass.
    const body = { error: "consent_required", declarationName: "team-notes", storeId: "sto_1" };
    await expect(
      requestStateFilesHandleWithConsent(
        optionsWith(() => Promise.resolve(jsonResponse(409, body))),
      ),
    ).rejects.toThrow();
  });

  test("a non-consent failure re-throws", async () => {
    await expect(
      requestStateFilesHandleWithConsent(
        optionsWith(() => Promise.resolve(jsonResponse(500, { error: "internal" }))),
      ),
    ).rejects.toThrow();
  });
});
