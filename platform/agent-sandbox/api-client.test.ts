import { describe, expect, test } from "bun:test";
import {
  AGENT_TOKEN_HEADER,
  EVE_SESSION_HEADER,
  type FetchLike,
  parseSandboxAccess,
  requestSandboxAccess,
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

const OK_BODY = {
  sandboxId: "sbx-1",
  sshHost: "ssh.app.daytona.io",
  sshUser: "tok",
  expiresAt: "2026-01-01T00:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("requestSandboxAccess", () => {
  test("POSTs the eve session key and returns the scoped access", async () => {
    const calls: { url: string; body: unknown }[] = [];
    const fakeFetch = (async (url, init) => {
      calls.push({ url, body: JSON.parse(bodyText(init)) });
      return jsonResponse(OK_BODY);
    }) satisfies FetchLike;

    const access = await requestSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      fetch: fakeFetch,
    });

    expect(access).toEqual(OK_BODY);
    const captured = calls[0];
    if (captured === undefined) throw new Error("fetch was never called");
    expect(captured.url).toBe("http://api.test/sandbox/session");
    expect(captured.body).toEqual({ eveSessionKey: "ses-abc" });
  });

  test("sends only the session key (API is authoritative on the sandbox)", async () => {
    let body: unknown = null;
    const fakeFetch = (async (_url, init) => {
      body = JSON.parse(bodyText(init));
      return jsonResponse(OK_BODY);
    }) satisfies FetchLike;

    await requestSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      fetch: fakeFetch,
    });

    expect(body).toEqual({ eveSessionKey: "ses-abc" });
  });

  test("attaches the agent token as the dedicated header when provided", async () => {
    let init: RequestInit | undefined;
    const fakeFetch = (async (_url, i) => {
      init = i;
      return jsonResponse(OK_BODY);
    }) satisfies FetchLike;

    await requestSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      agentToken: "agent.jwt.value",
      fetch: fakeFetch,
    });

    expect(header(init, AGENT_TOKEN_HEADER)).toBe("agent.jwt.value");
    // Never put it on Authorization (reserved for a WorkOS session).
    expect(header(init, "authorization")).toBeUndefined();
  });

  test("reports the eve session on its header (the join key apps/api carries)", async () => {
    let init: RequestInit | undefined;
    const fakeFetch = (async (_url, i) => {
      init = i;
      return jsonResponse(OK_BODY);
    }) satisfies FetchLike;

    await requestSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      agentToken: "agent.jwt.value",
      fetch: fakeFetch,
    });

    expect(header(init, EVE_SESSION_HEADER)).toBe("ses-abc");
  });

  // Blank/whitespace token → no header. apps/api trims and ignores a blank agent-token
  // header, so sending one just 401s; client and server agree on "blank = absent".
  for (const [label, token] of [
    ["empty", ""],
    ["whitespace-only", "   "],
  ] as const) {
    test(`omits the agent-token header for a ${label} token`, async () => {
      let init: RequestInit | undefined;
      const fakeFetch = (async (_url, i) => {
        init = i;
        return jsonResponse(OK_BODY);
      }) satisfies FetchLike;

      await requestSandboxAccess({
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
      return jsonResponse(OK_BODY);
    }) satisfies FetchLike;

    await requestSandboxAccess({
      apiBaseUrl: "http://api.test",
      eveSessionKey: "ses-abc",
      agentToken: "  agent.jwt.value  ",
      fetch: fakeFetch,
    });

    expect(header(init, AGENT_TOKEN_HEADER)).toBe("agent.jwt.value");
  });

  test("throws when the API responds non-ok", async () => {
    const fakeFetch = (async () =>
      new Response("no org", { status: 409 })) satisfies FetchLike;

    await expect(
      requestSandboxAccess({
        apiBaseUrl: "http://api.test",
        eveSessionKey: "ses-abc",
        fetch: fakeFetch,
      }),
    ).rejects.toThrow(/409/);
  });

  test("throws on a 200 with a shape-divergent body", async () => {
    const fakeFetch = (async () =>
      jsonResponse({ error: "surprise" })) satisfies FetchLike; // missing fields

    await expect(
      requestSandboxAccess({
        apiBaseUrl: "http://api.test",
        eveSessionKey: "ses-abc",
        fetch: fakeFetch,
      }),
    ).rejects.toThrow(/unexpected response shape/);
  });
});

describe("parseSandboxAccess", () => {
  test("accepts a well-formed access object", () => {
    expect(parseSandboxAccess(OK_BODY)).toEqual(OK_BODY);
  });

  test.each([
    ["null", null],
    ["a non-object", "nope"],
    ["a missing field", { sandboxId: "s", sshHost: "h", sshUser: "u" }],
    ["a non-string field", { ...OK_BODY, expiresAt: 123 }],
  ])("rejects %s", (_label, value) => {
    expect(parseSandboxAccess(value)).toBeNull();
  });
});
