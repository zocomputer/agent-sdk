import { describe, expect, test } from "bun:test";
import { buildConsentSteer } from "./state-consent";
import {
  createRuntimeStateFilesClient,
  DURABLE_STORAGE_FALLBACK,
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
      if (url === "https://api.example.test/runtime/state/assets/integrity") {
        return jsonResponse({ integrity: "v1.test-integrity" });
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

    const ref = await client.write("generated/hello world.png", new Uint8Array([1, 2, 3]), {
      contentType: "image/png",
    });
    expect(ref).toEqual({ type: "state_asset", declarationName: "files", path: "generated/hello world.png", integrity: "v1.test-integrity", contentType: "image/png", bytes: 3 });

    expect(calls).toHaveLength(3);
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

    const integrityCall = calls[1];
    expect(integrityCall?.url).toBe("https://api.example.test/runtime/state/assets/integrity");
    expect(new Headers(integrityCall?.init?.headers).get("x-zo-agent-token")).toBe("agent-token");
    expect(new Headers(integrityCall?.init?.headers).get("x-zo-eve-session")).toBe("eve-session");
    expect(integrityCall?.init?.body).toBe(
      JSON.stringify({ declarationName: "files", path: "generated/hello world.png" }),
    );

    const putCall = calls[2];
    expect(putCall?.url).toBe("https://acct.r2.example.test/bucket-one/generated/hello%20world.png");
    expect(putCall?.init?.method).toBe("PUT");
    expect(putCall?.init?.body).toEqual(new Uint8Array([1, 2, 3]));
    const putHeaders = new Headers(putCall?.init?.headers);
    expect(putHeaders.get("content-type")).toBe("image/png");
    expect(putHeaders.get("x-amz-security-token")).toBe("session-token");
    expect(putHeaders.get("authorization")).toContain("Credential=AKIA_TEST/20260705/auto/s3/aws4_request");
    expect(putHeaders.get("authorization")).not.toContain("secret");

  });

  test("honors the broker-authorized user-files fallback to shared-files", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    let handleCalls = 0;
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const fetch = Object.assign(async (
      input: Parameters<typeof globalThis.fetch>[0],
      init?: RequestInit,
    ) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      calls.push({ url, ...(init === undefined ? {} : { init }) });
      if (url.endsWith("/state/handles")) {
        handleCalls += 1;
        return jsonResponse({
          handleId: `hnd_${handleCalls}`,
          declarationName: "shared-files",
          interface: "files",
          access: handleCalls === 1 ? "rw" : "r",
          engine: "zo-blob-r2",
          bucketName: "shared-bucket",
          endpoint: "https://r2.test",
          credentials: {
            accessKeyId: "key",
            secretAccessKey: "secret",
            sessionToken: "token",
            expiresAt: "2026-07-05T23:00:00.000Z",
          },
        });
      }
      if (url.endsWith("/state/assets/integrity")) {
        return jsonResponse({ integrity: "v1.shared-proof" });
      }
      if (init?.method === "GET") return new Response(png);
      return new Response(null, { status: 200 });
    }, globalThis.fetch);
    const client = createRuntimeStateFilesClient({
      apiBaseUrl: "https://api.test",
      agentToken: "agent-token",
      declarationName: "user-files",
      fetch,
      getSessionId: () => "eve-session",
      getSessionCapability: () => "signed-session-capability",
      now: () => new Date("2026-07-05T22:00:00.000Z"),
      suggestedDefaults: { engine: "zo-blob-r2", partition: "user" },
    });

    const ref = await client.write("generated/shared.png", png);
    expect(ref).toMatchObject({
      declarationName: "shared-files",
      integrity: "v1.shared-proof",
    });
    await expect(client.read(ref, { maxBytes: png.byteLength })).resolves.toMatchObject({
      kind: "image",
      bytes: png.byteLength,
    });

    const brokerCalls = calls.filter((call) => call.url.startsWith("https://api.test"));
    const firstHandleBody = brokerCalls[0]?.init?.body;
    const integrityBody = brokerCalls[1]?.init?.body;
    const secondHandleBody = brokerCalls[2]?.init?.body;
    expect(typeof firstHandleBody === "string" ? JSON.parse(firstHandleBody) : null).toMatchObject({
      declarationName: "user-files",
    });
    expect(typeof integrityBody === "string" ? JSON.parse(integrityBody) : null).toEqual({
      declarationName: "shared-files",
      path: "generated/shared.png",
    });
    expect(typeof secondHandleBody === "string" ? JSON.parse(secondHandleBody) : null).toMatchObject({
      declarationName: "shared-files",
    });
    for (const call of brokerCalls) {
      expect(new Headers(call.init?.headers).get("x-zo-session-capability")).toBe(
        "signed-session-capability",
      );
    }
  });

  test("DURABLE_STORAGE_FALLBACK mirrors the broker's shared-fallback policy exactly", () => {
    // The one client-side copy of apps/api's shared-fallback resolution
    // (src/state/resolve.ts). Both the handle check and the asset-ref check
    // read this map — if the broker policy changes, change THIS entry, and
    // this pin, together.
    expect(DURABLE_STORAGE_FALLBACK).toEqual({ "user-files": "shared-files" });
  });

  test("the handle check rejects the fallback declaration when the request was not user-files", async () => {
    // `shared-files` is an authorized substitute ONLY for a `user-files`
    // request; for any other configured declaration it is "a handle for
    // another declaration" and must be rejected before object access.
    let handleCalls = 0;
    const fetch = Object.assign(async () => {
      handleCalls += 1;
      return jsonResponse({
        handleId: "hnd_x",
        declarationName: "shared-files",
        interface: "files",
        access: "rw",
        engine: "zo-blob-r2",
        bucketName: "shared-bucket",
        endpoint: "https://r2.test",
        credentials: {
          accessKeyId: "key",
          secretAccessKey: "secret",
          sessionToken: "token",
          expiresAt: "2026-07-05T23:00:00.000Z",
        },
      });
    }, globalThis.fetch);
    const client = createRuntimeStateFilesClient({
      apiBaseUrl: "https://api.test",
      agentToken: "agent-token",
      declarationName: "files",
      fetch,
      getSessionId: () => "eve-session",
      now: () => new Date("2026-07-05T22:00:00.000Z"),
    });

    await expect(client.write("generated/x.png", new Uint8Array([1]))).rejects.toThrow(
      "another declaration",
    );
    expect(handleCalls).toBe(1);
  });

  test("the asset-ref check rejects a shared-files ref when the configured declaration is not user-files", async () => {
    // Same policy at the read boundary: a `shared-files` reference only passes
    // for a `user-files` client, and the rejection happens before any broker
    // or object access.
    let calls = 0;
    const client = createRuntimeStateFilesClient({
      apiBaseUrl: "https://api.test",
      agentToken: "agent-token",
      declarationName: "files",
      fetch: Object.assign(async () => {
        calls += 1;
        return new Response(null, { status: 500 });
      }, globalThis.fetch),
    });

    await expect(
      client.read(
        { type: "state_asset", declarationName: "shared-files", path: "x.png" },
        { maxBytes: 10 },
      ),
    ).rejects.toThrow("configured");
    expect(calls).toBe(0);
  });

  test("does not write an object when the integrity proof cannot be minted", async () => {
    const urls: string[] = [];
    const fetch = Object.assign(async (input: Parameters<typeof globalThis.fetch>[0]) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      urls.push(url);
      if (url.endsWith("/state/handles")) {
        return jsonResponse({
          handleId: "hnd_123",
          declarationName: "files",
          interface: "files",
          access: "rw",
          engine: "zo-blob-r2",
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
      return jsonResponse({ error: "provider_unconfigured" }, { status: 503 });
    }, globalThis.fetch);
    const client = createRuntimeStateFilesClient({
      apiBaseUrl: "https://api.example.test/runtime",
      agentToken: "agent-token",
      fetch,
      getSessionId: () => "eve-session",
      now: () => new Date("2026-07-05T22:00:00.000Z"),
    });

    await expect(client.write("generated/fail.png", new Uint8Array([1]))).rejects.toThrow();
    expect(urls).toEqual([
      "https://api.example.test/runtime/state/handles",
      "https://api.example.test/runtime/state/assets/integrity",
    ]);
  });

  test("bounds a hung integrity request and aborts its fetch", async () => {
    const captured: { signal?: AbortSignal } = {};
    const fetch = Object.assign(
      async (
        input: Parameters<typeof globalThis.fetch>[0],
        init?: Parameters<typeof globalThis.fetch>[1],
      ) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url.endsWith("/state/handles")) {
          return jsonResponse({
            handleId: "hnd_123",
            declarationName: "files",
            interface: "files",
            access: "rw",
            engine: "zo-blob-r2",
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
        if (init?.signal !== null && init?.signal !== undefined) {
          captured.signal = init.signal;
        }
        return await new Promise<Response>(() => {});
      },
      globalThis.fetch,
    );
    const client = createRuntimeStateFilesClient({
      apiBaseUrl: "https://api.example.test/runtime",
      agentToken: "agent-token",
      brokerRequestTimeoutMs: 5,
      fetch,
      getSessionId: () => "eve-session",
      now: () => new Date("2026-07-05T22:00:00.000Z"),
    });

    await expect(
      client.write("generated/hung.png", new Uint8Array([1])),
    ).rejects.toThrow("broker timed out");
    expect(captured.signal?.aborted).toBe(true);
  });

  test("keeps the integrity deadline active while the response body stalls", async () => {
    const captured: { signal?: AbortSignal } = {};
    const fetch = Object.assign(
      async (
        input: Parameters<typeof globalThis.fetch>[0],
        init?: Parameters<typeof globalThis.fetch>[1],
      ) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url.endsWith("/state/handles")) {
          return jsonResponse({
            handleId: "hnd_123",
            declarationName: "files",
            interface: "files",
            access: "rw",
            engine: "zo-blob-r2",
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
        if (init?.signal !== null && init?.signal !== undefined) {
          captured.signal = init.signal;
        }
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"integrity":"partial'));
            },
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
      globalThis.fetch,
    );
    const client = createRuntimeStateFilesClient({
      apiBaseUrl: "https://api.example.test/runtime",
      agentToken: "agent-token",
      brokerRequestTimeoutMs: 5,
      fetch,
      getSessionId: () => "eve-session",
      now: () => new Date("2026-07-05T22:00:00.000Z"),
    });

    await expect(
      client.write("generated/hung-body.png", new Uint8Array([1])),
    ).rejects.toThrow("broker timed out");
    expect(captured.signal?.aborted).toBe(true);
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

  test("reads through an r handle, signs the exact object, and sniffs bytes", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const fetch = Object.assign(async (input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, ...(init === undefined ? {} : { init }) });
      if (url.endsWith("/state/handles")) return jsonResponse({
        handleId: "hnd_r", declarationName: "files", interface: "files", access: "r", engine: "zo-blob-r2",
        bucketName: "bucket-one", endpoint: "https://acct.r2.example.test", credentials: {
          accessKeyId: "AKIA_TEST", secretAccessKey: "secret", sessionToken: "token", expiresAt: "2026-07-05T23:00:00.000Z",
        },
      });
      return new Response(png, { headers: { "content-type": "text/plain" } });
    }, globalThis.fetch);
    const client = createRuntimeStateFilesClient({ apiBaseUrl: "https://api.example.test", agentToken: "token", fetch, now: () => new Date("2026-07-05T22:00:00.000Z") });
    const asset = await client.read({ type: "state_asset", declarationName: "files", path: "uploads/cat fake.mp3", contentType: "audio/mpeg" }, { maxBytes: 8 });
    const handleBody = calls[0]?.init?.body;
    expect(typeof handleBody === "string" ? JSON.parse(handleBody) : null).toMatchObject({ access: "r", declarationName: "files" });
    expect(calls[1]?.url).toBe("https://acct.r2.example.test/bucket-one/uploads/cat%20fake.mp3");
    expect(calls[1]?.init?.method).toBe("GET");
    expect(asset).toMatchObject({ kind: "image", contentType: "image/png", bytes: 8 });
  });

  test("creates an exact-object GET URL capped by the read handle expiry", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetch = Object.assign(async (input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, ...(init === undefined ? {} : { init }) });
      return jsonResponse({
        handleId: "hnd_r", declarationName: "files", interface: "files", access: "r", engine: "zo-blob-r2",
        bucketName: "bucket-one", endpoint: "https://acct.r2.example.test", credentials: {
          accessKeyId: "AKIA_TEST", secretAccessKey: "secret", sessionToken: "session-token", expiresAt: "2026-07-05T22:02:00.000Z",
        },
      });
    }, globalThis.fetch);
    const client = createRuntimeStateFilesClient({ apiBaseUrl: "https://api.example.test", agentToken: "token", fetch, now: () => new Date("2026-07-05T22:00:00.000Z") });
    if (client.resolveUrl === undefined) throw new Error("runtime store must support URL delivery");
    const url = await client.resolveUrl({ type: "state_asset", declarationName: "files", path: "uploads/a b.mp4" }, 300);

    expect(calls).toHaveLength(1);
    const handleBody = calls[0]?.init?.body;
    expect(typeof handleBody === "string" ? JSON.parse(handleBody) : null).toMatchObject({ access: "r" });
    expect(url.origin + url.pathname).toBe("https://acct.r2.example.test/bucket-one/uploads/a%20b.mp4");
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("120");
    expect(url.searchParams.get("X-Amz-Security-Token")).toBe("session-token");
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe("host");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/u);
    expect(url.toString()).not.toContain("secret");
  });

  test("confines URL paths and validates expiry before requesting credentials", async () => {
    let calls = 0;
    const client = createRuntimeStateFilesClient({
      apiBaseUrl: "https://api.example.test",
      agentToken: "token",
      fetch: Object.assign(async () => { calls += 1; return new Response(null, { status: 500 }); }, globalThis.fetch),
    });
    if (client.resolveUrl === undefined) throw new Error("runtime store must support URL delivery");
    await expect(client.resolveUrl({ type: "state_asset", declarationName: "files", path: "../secret.mp4" }, 60)).rejects.toThrow(".. segments");
    await expect(client.resolveUrl({ type: "state_asset", declarationName: "files", path: "safe.mp4" }, 0)).rejects.toThrow("positive safe integer");
    expect(calls).toBe(0);
  });

  test("bounds streamed reads and confines declarations before handle access", async () => {
    let objectReads = 0;
    const fetch = Object.assign(async (input: Parameters<typeof globalThis.fetch>[0]) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/state/handles")) return jsonResponse({
        handleId: "hnd_r", declarationName: "files", interface: "files", access: "r", engine: "zo-blob-r2",
        bucketName: "bucket", endpoint: "https://r2.test", credentials: { accessKeyId: "key", secretAccessKey: "secret", sessionToken: "token", expiresAt: "2026-07-05T23:00:00.000Z" },
      });
      objectReads += 1;
      return new Response(new Uint8Array([1, 2, 3, 4]));
    }, globalThis.fetch);
    const client = createRuntimeStateFilesClient({ apiBaseUrl: "https://api.test", agentToken: "token", fetch, now: () => new Date("2026-07-05T22:00:00.000Z") });
    await expect(client.read({ type: "state_asset", declarationName: "files", path: "x.png" }, { maxBytes: 3 })).rejects.toThrow("3 byte read limit");
    await expect(client.read({ type: "state_asset", declarationName: "other", path: "x.png" }, { maxBytes: 3 })).rejects.toThrow("configured");
    expect(objectReads).toBe(1);
  });

  test("rejects mismatched and expired handles before object access", async () => {
    for (const variant of [{ declarationName: "other", expiresAt: "2026-07-05T23:00:00.000Z" }, { declarationName: "files", expiresAt: "2026-07-05T21:00:00.000Z" }]) {
      let calls = 0;
      const fetch = Object.assign(async () => {
        calls += 1;
        return jsonResponse({ handleId: "h", declarationName: variant.declarationName, interface: "files", access: "r", engine: "zo-blob-r2", bucketName: "b", endpoint: "https://r2.test", credentials: { accessKeyId: "k", secretAccessKey: "s", sessionToken: "t", expiresAt: variant.expiresAt } });
      }, globalThis.fetch);
      const client = createRuntimeStateFilesClient({ apiBaseUrl: "https://api.test", agentToken: "token", fetch, now: () => new Date("2026-07-05T22:00:00.000Z") });
      await expect(client.read({ type: "state_asset", declarationName: "files", path: "x.png" }, { maxBytes: 10 })).rejects.toBeInstanceOf(StateFilesRuntimeError);
      expect(calls).toBe(1);
    }
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

  test("preserves a broker error code when no detail message is present", async () => {
    const client = consentClient({ error: "access_denied" }, 403);
    await expect(
      client.write("generated/cat.png", new Uint8Array([1])),
    ).rejects.toThrow("access_denied");
  });
});

describe("stateAssetReference", () => {
  test("normalizes a stable state_asset envelope", () => {
    expect(
      stateAssetReference({
        type: "state_asset",
        declarationName: "files",
        path: "generated/cat.png",
        integrity: "v1.test-integrity",
        contentType: "image/png",
        bytes: 10,
      }),
    ).toEqual({
      type: "state_asset",
      declarationName: "files",
      path: "generated/cat.png",
      integrity: "v1.test-integrity",
      contentType: "image/png",
      bytes: 10,
    });
  });

  test("shares state-file path rejection semantics", () => {
    expect(() => normalizeStateFilePath("/absolute.png")).toThrow("relative");
    expect(() => stateAssetReference({ type: "state_asset", declarationName: "files", path: "a//b", integrity: "v1.test-integrity" })).toThrow(
      "empty, . or ..",
    );
  });

  test("rejects an empty browser integrity proof", () => {
    expect(() =>
      stateAssetReference({
        type: "state_asset",
        declarationName: "files",
        path: "generated/cat.png",
        integrity: " ",
      }),
    ).toThrow("integrity proof must not be empty");
  });
});
