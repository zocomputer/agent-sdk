import { describe, expect, test } from "bun:test";
import { buildConsentSteer } from "./state-consent";
import {
  createRuntimeStateFilesClient,
  normalizeStateFilePath,
  StateFilesConsentError,
  StateFilesRuntimeError,
  stateAssetReference,
} from "./state-files";

// `headers` is a plain record (not the full `HeadersInit`) so the object
// spread below can't hit the array/`Headers` forms, which would spread into
// numeric indices.
function jsonResponse(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

describe("createRuntimeStateFilesClient", () => {
  test("requests an rw files handle and writes the exact state file object", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetch = Object.assign(async (input: Parameters<typeof globalThis.fetch>[0], init?: Parameters<typeof globalThis.fetch>[1]) => {
      // The client always calls fetch with a plain string URL; narrow rather
      // than `String()`/`.toString()` (a bare `Request`'s type allows it, and
      // `Request` doesn't override the default "[object Request]" stringification).
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, ...(init === undefined ? {} : { init }) });
      if (url === "https://api.example.test/runtime/state/handles") {
        return jsonResponse({
          handleId: "hnd_123",
          declarationName: "files",
          interface: "files",
          access: "rw",
          engine: "zo-blob-r2",
          storeId: "store_123",
          stateInstanceId: "sti_123",
          partition: "session",
          bucketName: "bucket-one",
          endpoint: "https://acct.r2.example.test",
          credentials: {
            accessKeyId: "AKIA_TEST",
            secretAccessKey: "secret",
            sessionToken: "session-token",
            expiresAt: "2026-07-05T23:00:00.000Z",
          },
        });
      }
      return new Response(null, { status: 200 });
    }, globalThis.fetch);

    const client = createRuntimeStateFilesClient({
      apiBaseUrl: "https://api.example.test/runtime",
      agentToken: "agent-token",
      declarationName: "files",
      fetch,
      getSessionId: () => "eve-session",
      now: () => new Date("2026-07-05T22:00:00.000Z"),
    });

    await client.write("generated/hello world.png", new Uint8Array([1, 2, 3]), {
      contentType: "image/png",
    });

    expect(calls).toHaveLength(2);
    const handleCall = calls[0];
    expect(handleCall?.url).toBe("https://api.example.test/runtime/state/handles");
    expect(new Headers(handleCall?.init?.headers).get("x-zo-agent-token")).toBe("agent-token");
    expect(new Headers(handleCall?.init?.headers).get("x-zo-eve-session")).toBe("eve-session");
    expect(handleCall?.init?.body).toBe(
      JSON.stringify({
        declarationName: "files",
        interface: "files",
        access: "rw",
        suggestedDefaults: { engine: "zo-blob-r2", partition: "session" },
      }),
    );

    const putCall = calls[1];
    expect(putCall?.url).toBe("https://acct.r2.example.test/bucket-one/generated/hello%20world.png");
    expect(putCall?.init?.method).toBe("PUT");
    expect(putCall?.init?.body).toEqual(new Uint8Array([1, 2, 3]));
    const putHeaders = new Headers(putCall?.init?.headers);
    expect(putHeaders.get("content-type")).toBe("image/png");
    expect(putHeaders.get("x-amz-security-token")).toBe("session-token");
    expect(putHeaders.get("authorization")).toContain("Credential=AKIA_TEST/20260705/auto/s3/aws4_request");
    expect(putHeaders.get("authorization")).not.toContain("secret");
  });

  test("rejects unsafe paths before requesting a handle", async () => {
    const calls: unknown[] = [];
    const client = createRuntimeStateFilesClient({
      apiBaseUrl: "https://api.example.test",
      agentToken: "agent-token",
      fetch: Object.assign(async (input: Parameters<typeof globalThis.fetch>[0], init?: Parameters<typeof globalThis.fetch>[1]) => {
        calls.push({ input, ...(init === undefined ? {} : { init }) });
        return new Response(null, { status: 500 });
      }, globalThis.fetch),
    });

    await expect(client.write("../secret.png", new Uint8Array())).rejects.toThrow(
      "state file path",
    );
    expect(calls).toEqual([]);
  });
});

describe("consent_required steer", () => {
  const CONSENT_BODY = {
    error: "consent_required",
    declarationName: "files",
    storeId: "sts_xyz",
    bindingId: "stb_abc123",
    resourceName: "Files",
    party: { handle: "org_acme", external: false },
  };

  function consentClient(body: unknown, status = 409) {
    return createRuntimeStateFilesClient({
      apiBaseUrl: "https://api.example.test",
      agentToken: "agent-token",
      declarationName: "files",
      getSessionId: () => "eve-session",
      fetch: Object.assign(
        async () =>
          new Response(JSON.stringify(body), {
            status,
            headers: { "content-type": "application/json" },
          }),
        globalThis.fetch,
      ),
    });
  }

  test("a consent_required 409 with an envelope throws a StateFilesConsentError carrying the envelope + steer", async () => {
    const client = consentClient(CONSENT_BODY);
    const error = await client.write("generated/cat.png", new Uint8Array([1])).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(StateFilesConsentError);
    if (error instanceof StateFilesConsentError) {
      expect(error.envelope).toEqual({
        bindingId: "stb_abc123",
        declarationName: "files",
        resourceName: "Files",
        party: { handle: "org_acme", external: false },
      });
      // The thrown message IS the model-facing steer — eve surfaces it verbatim
      // as the tool-error `error-text` the model reacts to.
      expect(error.message).toBe(buildConsentSteer(error.envelope));
    }
  });

  test("a consent_required 409 WITHOUT a parseable envelope falls back to StateFilesRuntimeError", async () => {
    // Missing bindingId/party — nothing valid to steer the model with, so a raw
    // failure beats a steer the model can't act on.
    const client = consentClient({ error: "consent_required", declarationName: "files", storeId: "sts_xyz" });
    const error = await client.write("generated/cat.png", new Uint8Array([1])).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(StateFilesRuntimeError);
    expect(error).not.toBeInstanceOf(StateFilesConsentError);
  });

  test("a non-consent broker error still throws StateFilesRuntimeError", async () => {
    const client = consentClient({ error: "provider_unconfigured", message: "no creds" }, 503);
    const error = await client.write("generated/cat.png", new Uint8Array([1])).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(StateFilesRuntimeError);
    expect(error).not.toBeInstanceOf(StateFilesConsentError);
  });
});

describe("stateAssetReference", () => {
  test("normalizes a stable state_asset envelope", () => {
    expect(
      stateAssetReference({
        type: "state_asset",
        declarationName: "files",
        path: "generated/cat.png",
        contentType: "image/png",
        bytes: 10,
      }),
    ).toEqual({
      type: "state_asset",
      declarationName: "files",
      path: "generated/cat.png",
      contentType: "image/png",
      bytes: 10,
    });
  });

  test("shares state-file path rejection semantics", () => {
    expect(() => normalizeStateFilePath("/absolute.png")).toThrow("relative");
    expect(() => stateAssetReference({ type: "state_asset", declarationName: "files", path: "a//b" })).toThrow(
      "empty, . or ..",
    );
  });
});
