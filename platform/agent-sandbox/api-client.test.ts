import { describe, expect, test } from "bun:test";
import {
  AGENT_TOKEN_HEADER,
  EVE_SESSION_HEADER,
  type FetchLike,
  parseSandboxAccess,
  parseSandboxHandleAccess,
  requestScratchSandboxAccess,
  SandboxBrokerError,
} from "./api-client";

/** Read a header off a fetch init in a way that works whether init.headers is a
 * plain object or a Headers — the client builds a plain object, but be robust. */
function header(init: RequestInit | undefined, name: string): string | undefined {
  const h = init?.headers;
  if (!h) return undefined;
  if (h instanceof Headers) return h.get(name) ?? undefined;
  return (h as Record<string, string>)[name];
}

/** The client always sends a JSON string body; narrow rather than blind `String()`
 * (RequestInit.body's real type covers Blob/ReadableStream/etc, which don't stringify meaningfully). */
function bodyText(init: RequestInit | undefined): string {
  return typeof init?.body === "string" ? init.body : "";
}

const SSH_ACCESS = {
  sandboxId: "sbx-1",
  sshHost: "ssh.app.daytona.io",
  sshUser: "tok",
  expiresAt: "2026-01-01T00:00:00.000Z",
};

/** A full `sandbox-daytona` state handle, as POST /state/handles returns for `scratch`. */
const HANDLE_BODY = {
  handleId: "hdl_1",
  declarationName: "scratch",
  interface: "exec",
  access: "rw",
  engine: "sandbox-daytona",
  storeId: "sto_1",
  stateInstanceId: "sti_1",
  partition: "session",
  sandboxResourceId: "sbr_1",
  rootPath: "/home/daytona",
  sandbox: SSH_ACCESS,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("requestScratchSandboxAccess", () => {
  test("POSTs the scratch declaration to the broker and returns the scoped SSH access", async () => {
    const requests: Array<{ url: string; body: unknown }> = [];
    const fakeFetch = (async (url, init) => {
      requests.push({ url, body: JSON.parse(bodyText(init)) });
      return jsonResponse(HANDLE_BODY);
    }) satisfies FetchLike;

    const access = await requestScratchSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      fetch: fakeFetch,
    });

    expect(access).toEqual(SSH_ACCESS);
    const request = requests[0];
    if (request === undefined) throw new Error("scratch broker request was not captured");
    expect(request.url).toBe("http://api.test/state/handles");
    // scratch declaration + sandbox-engine hints so an unbound declaration
    // zero-configs onto the sandbox engine, not the broker's R2 default.
    expect(request.body).toEqual({
      declarationName: "scratch",
      interface: "exec",
      access: "rw",
      suggestedDefaults: { engine: "sandbox-daytona", partition: "session" },
    });
  });

  test("sends the eve session on its header only, never in the body (the trusted session key)", async () => {
    const requests: Array<{ body: unknown; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (_url, init) => {
      requests.push({ body: JSON.parse(bodyText(init)), init });
      return jsonResponse(HANDLE_BODY);
    }) satisfies FetchLike;

    await requestScratchSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      fetch: fakeFetch,
    });

    const request = requests[0];
    if (request === undefined) throw new Error("scratch broker request was not captured");
    expect(header(request.init, EVE_SESSION_HEADER)).toBe("ses-abc");
    // No body eveSessionKey → never trips the route's header/body mismatch guard.
    expect(request.body).not.toHaveProperty("eveSessionKey");
  });


  test("trims the eve session header and omits it when blank", async () => {
    const seen: Array<RequestInit | undefined> = [];
    const fakeFetch = (async (_url, init) => {
      seen.push(init);
      return jsonResponse(HANDLE_BODY);
    }) satisfies FetchLike;

    await requestScratchSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "  ses-trimmed  ",
      fetch: fakeFetch,
    });
    await requestScratchSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "   ",
      fetch: fakeFetch,
    });

    expect(header(seen[0], EVE_SESSION_HEADER)).toBe("ses-trimmed");
    expect(header(seen[1], EVE_SESSION_HEADER)).toBeUndefined();
  });

  test("attaches the agent token as the dedicated header when provided", async () => {
    let init: RequestInit | undefined;
    const fakeFetch = (async (_url, i) => {
      init = i;
      return jsonResponse(HANDLE_BODY);
    }) satisfies FetchLike;

    await requestScratchSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      agentToken: "agent.jwt.value",
      fetch: fakeFetch,
    });

    expect(header(init, AGENT_TOKEN_HEADER)).toBe("agent.jwt.value");
    // Never put it on Authorization (reserved for a WorkOS session).
    expect(header(init, "authorization")).toBeUndefined();
  });

  // Blank/whitespace token → no header. apps/api trims and ignores a blank agent-token
  // header; client and server agree on "blank = absent".
  for (const [label, token] of [
    ["empty", ""],
    ["whitespace-only", "   "],
  ] as const) {
    test(`omits the agent-token header for a ${label} token`, async () => {
      let init: RequestInit | undefined;
      const fakeFetch = (async (_url, i) => {
        init = i;
        return jsonResponse(HANDLE_BODY);
      }) satisfies FetchLike;

      await requestScratchSandboxAccess({
        apiBaseUrl: "http://api.test",
        eveSessionKey: "ses-abc",
        agentToken: token, // explicit → don't read the ambient env in a test
        fetch: fakeFetch,
      });

      expect(header(init, AGENT_TOKEN_HEADER)).toBeUndefined();
    });
  }

  test("sends the trimmed token (matches the bytes apps/api verifies)", async () => {
    let init: RequestInit | undefined;
    const fakeFetch = (async (_url, i) => {
      init = i;
      return jsonResponse(HANDLE_BODY);
    }) satisfies FetchLike;

    await requestScratchSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      agentToken: "  agent.jwt.value  ",
      fetch: fakeFetch,
    });

    expect(header(init, AGENT_TOKEN_HEADER)).toBe("agent.jwt.value");
  });

  // ── error taxonomy the flip introduces ──────────────────────────────────────

  test("maps 403 unsupported_actor to a SandboxBrokerError with the code + status", async () => {
    const fakeFetch = (async () =>
      jsonResponse(
        { error: "unsupported_actor", message: "State handles require an agent actor." },
        403,
      )) satisfies FetchLike;

    const promise = requestScratchSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      fetch: fakeFetch,
    });
    await expect(promise).rejects.toThrow(SandboxBrokerError);
    await expect(promise).rejects.toThrow(/unsupported_actor/);
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SandboxBrokerError);
    expect((error as SandboxBrokerError).status).toBe(403);
    expect((error as SandboxBrokerError).code).toBe("unsupported_actor");
  });

  test("maps 400 eve_session_required to a SandboxBrokerError with the code + status", async () => {
    const fakeFetch = (async () =>
      jsonResponse(
        { error: "eve_session_required", message: "This state partition requires an eve session." },
        400,
      )) satisfies FetchLike;

    const error = await requestScratchSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      fetch: fakeFetch,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SandboxBrokerError);
    expect((error as SandboxBrokerError).status).toBe(400);
    expect((error as SandboxBrokerError).code).toBe("eve_session_required");
    expect((error as SandboxBrokerError).message).toMatch(/x-zo-eve-session/);
  });

  test("surfaces a generic broker failure code + status", async () => {
    const fakeFetch = (async () =>
      jsonResponse({ error: "provisioning_failed", cause: "mint_sandbox_access" }, 503)) satisfies FetchLike;

    const error = await requestScratchSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      fetch: fakeFetch,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SandboxBrokerError);
    expect((error as SandboxBrokerError).status).toBe(503);
    expect((error as SandboxBrokerError).code).toBe("provisioning_failed");
  });

  test("throws malformed_handle when the broker returns a non-sandbox (R2) handle", async () => {
    // If `scratch` ever resolved onto the R2 default engine, there is no SSH access.
    const fakeFetch = (async () =>
      jsonResponse({ engine: "zo-blob-r2", bucketName: "b", credentials: {} })) satisfies FetchLike;

    const error = await requestScratchSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      fetch: fakeFetch,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SandboxBrokerError);
    expect((error as SandboxBrokerError).code).toBe("malformed_handle");
  });

  test("throws malformed_handle when the sandbox handle omits SSH access", async () => {
    const fakeFetch = (async () =>
      jsonResponse({ ...HANDLE_BODY, sandbox: { sandboxId: "s" } })) satisfies FetchLike;

    await expect(
      requestScratchSandboxAccess({
        apiBaseUrl: "http://api.test",
        eveSessionKey: "ses-abc",
        fetch: fakeFetch,
      }),
    ).rejects.toThrow(/malformed/);
  });
});

describe("parseSandboxAccess", () => {
  test("accepts a well-formed access object", () => {
    expect(parseSandboxAccess(SSH_ACCESS)).toEqual(SSH_ACCESS);
  });

  test.each([
    ["null", null],
    ["a non-object", "nope"],
    ["a missing field", { sandboxId: "s", sshHost: "h", sshUser: "u" }],
    ["a non-string field", { ...SSH_ACCESS, expiresAt: 123 }],
  ])("rejects %s", (_label, value) => {
    expect(parseSandboxAccess(value)).toBeNull();
  });
});

describe("parseSandboxHandleAccess", () => {
  test("extracts the nested SSH access from a sandbox-daytona handle", () => {
    expect(parseSandboxHandleAccess(HANDLE_BODY)).toEqual(SSH_ACCESS);
  });

  test.each([
    ["null", null],
    ["a non-object", "nope"],
    ["a non-sandbox engine", { engine: "zo-blob-r2", sandbox: SSH_ACCESS }],
    ["a missing sandbox field", { ...HANDLE_BODY, sandbox: undefined }],
    ["a malformed sandbox field", { ...HANDLE_BODY, sandbox: { sandboxId: "s" } }],
  ])("rejects %s", (_label, value) => {
    expect(parseSandboxHandleAccess(value)).toBeNull();
  });
});
