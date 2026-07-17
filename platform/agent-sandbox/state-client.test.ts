import { describe, expect, test } from "bun:test";
import type { ExternalStateDeclaration } from "../../src/state.ts";
import {
  StateSandboxHandleError,
  type StateSandboxSessionLike,
  type StateSandboxSpawnedProcess,
} from "../../src/state-sandbox.ts";
import { zoStateSandbox } from "./state-client";

// The composed declaration-bound client: broker request construction from the
// declaration, ambient identity latching across renewals (the zo-backend
// contract), the R7 scratch-only ambient-env gate, and delegation to one
// session. The SSH transport is behind the injectable `createSession` seam —
// no live socket; the broker behind the injectable `fetch`.

const WORKSPACE: ExternalStateDeclaration = {
  name: "workspace",
  interface: "exec",
  access: "rw",
  intent: "private",
  suggestedDefaults: { engine: "sandbox-daytona", partition: "user" },
};

function handleJson(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    handleId: "h_1",
    declarationName: "workspace",
    interface: "exec",
    access: "rw",
    engine: "sandbox-daytona",
    storeId: "sto_1",
    stateInstanceId: "sti_1",
    partition: "user",
    sandboxResourceId: "sbx_1",
    rootPath: "/home/daytona/state/workspace",
    lifecycle: "ready",
    sandbox: {
      sandboxId: "dtn_1",
      sshHost: "ssh.example.test",
      sshUser: "token-1",
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    },
    ...overrides,
  };
}

interface RecordedRequest {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: Record<string, unknown>;
}

/** A fetch fake that records each broker request and serves queued responses. */
function brokerFake(
  responses: ReadonlyArray<{ status: number; json: unknown }>,
): { fetch: typeof fetch; requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  let call = 0;
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => {
      headers[key] = value;
    });
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const rawBody = typeof init?.body === "string" ? init.body : "{}";
    requests.push({
      url,
      headers,
      body: JSON.parse(rawBody) as Record<string, unknown>,
    });
    const next = responses[Math.min(call, responses.length - 1)];
    call += 1;
    if (next === undefined) throw new Error("brokerFake: no response queued");
    return new Response(JSON.stringify(next.json), { status: next.status });
  }) as typeof fetch;
  return { fetch: impl, requests };
}

interface FakeSessionCall {
  readonly kind: string;
  readonly options: unknown;
}

function fakeSession(): {
  session: StateSandboxSessionLike;
  calls: FakeSessionCall[];
  disposed: () => boolean;
} {
  const calls: FakeSessionCall[] = [];
  let disposed = false;
  const spawned: StateSandboxSpawnedProcess = {
    stdout: (async function* () {})(),
    stderr: (async function* () {})(),
    exitCode: Promise.resolve(0),
    kill: () => {},
  };
  const session: StateSandboxSessionLike = {
    run(options) {
      calls.push({ kind: "run", options });
      return Promise.resolve({ exitCode: 0, stdout: "ok", stderr: "" });
    },
    spawn(options) {
      calls.push({ kind: "spawn", options });
      return Promise.resolve(spawned);
    },
    readBinaryFile(options) {
      calls.push({ kind: "read", options });
      return Promise.resolve(new TextEncoder().encode("bytes"));
    },
    writeBinaryFile(options) {
      calls.push({ kind: "write", options });
      return Promise.resolve();
    },
    removePath(options) {
      calls.push({ kind: "remove", options });
      return Promise.resolve();
    },
    dispose() {
      disposed = true;
    },
  };
  return { session, calls, disposed: () => disposed };
}

describe("zoStateSandbox request construction", () => {
  test("an exec declaration produces the expected broker request and delegates to one session", async () => {
    const broker = brokerFake([{ status: 200, json: handleJson() }]);
    const fake = fakeSession();
    const client = zoStateSandbox(WORKSPACE, {
      apiBaseUrl: "http://api.test",
      fetch: broker.fetch,
      agentToken: "agt-token",
      ambientParent: () => null,
      ambientSessionId: () => "wrun_current",
      ambientCapability: () => "cap-1",
      createSession: () => Promise.resolve(fake.session),
    });

    const result = await client.exec("echo hi");
    expect(result.exitCode).toBe(0);
    await client.files.write("notes/a.txt", "hello");
    const bytes = await client.files.read("notes/a.txt");
    expect(bytes).not.toBeNull();

    expect(broker.requests).toHaveLength(1);
    const request = broker.requests[0];
    if (request === undefined) throw new Error("expected a broker request");
    expect(request.url).toBe("http://api.test/state/handles");
    expect(request.body).toEqual({
      declarationName: "workspace",
      interface: "exec",
      access: "rw",
      suggestedDefaults: { engine: "sandbox-daytona", partition: "user" },
    });
    expect(request.headers["x-zo-agent-token"]).toBe("agt-token");
    expect(request.headers["x-zo-eve-session"]).toBe("wrun_current");
    expect(request.headers["x-zo-session-capability"]).toBe("cap-1");

    // All three operations rode the ONE session, paths scoped under rootPath.
    expect(fake.calls.map((c) => c.kind)).toEqual(["run", "write", "read"]);
    const writeOptions = fake.calls[1]?.options as { path: string };
    expect(writeOptions.path).toBe("/home/daytona/state/workspace/notes/a.txt");
    const runOptions = fake.calls[0]?.options as { workingDirectory: string };
    expect(runOptions.workingDirectory).toBe("/home/daytona/state/workspace");
  });

  test("a files declaration never escapes rootPath", async () => {
    const broker = brokerFake([
      { status: 200, json: handleJson({ interface: "files", declarationName: "notes" }) },
    ]);
    const fake = fakeSession();
    const client = zoStateSandbox(
      { name: "notes", interface: "files", access: "rw", intent: "private" },
      {
        apiBaseUrl: "http://api.test",
        fetch: broker.fetch,
        agentToken: "agt-token",
        ambientParent: () => null,
        ambientSessionId: () => "wrun_current",
        ambientCapability: () => undefined,
        createSession: () => Promise.resolve(fake.session),
      },
    );
    await expect(client.files.read("../../etc/passwd")).rejects.toThrow();
    expect(fake.calls).toHaveLength(0);
  });

  test("sql and http declarations are rejected at composition time", () => {
    for (const iface of ["sql", "http"] as const) {
      expect(() =>
        zoStateSandbox({ name: "db", interface: iface, access: "rw", intent: "private" }),
      ).toThrow(/only "exec" and "files"/);
    }
  });
});

describe("ambient identity latching", () => {
  test("a nested subagent keys the broker on its ROOT session id", async () => {
    const broker = brokerFake([{ status: 200, json: handleJson() }]);
    const fake = fakeSession();
    const client = zoStateSandbox(WORKSPACE, {
      apiBaseUrl: "http://api.test",
      fetch: broker.fetch,
      agentToken: "agt-token",
      ambientParent: () => ({
        callId: "call_1",
        rootSessionId: "wrun_root",
        sessionId: "wrun_child",
      }),
      ambientSessionId: () => "wrun_child_own",
      ambientCapability: () => undefined,
      createSession: () => Promise.resolve(fake.session),
    });
    await client.exec("true");
    expect(broker.requests[0]?.headers["x-zo-eve-session"]).toBe("wrun_root");
  });

  test("a capability that appears only inside ALS is latched; a later renewal outside ALS sends the same value", async () => {
    // Two mints: an expired first handle forces a renewal on the next call.
    const expired = handleJson({
      sandbox: {
        sandboxId: "dtn_1",
        sshHost: "ssh.example.test",
        sshUser: "token-1",
        expiresAt: new Date(Date.now() + 1_000).toISOString(),
      },
    });
    const broker = brokerFake([
      { status: 200, json: expired },
      { status: 200, json: handleJson() },
    ]);
    const fake = fakeSession();
    // The capability read resolves on the SECOND read (mint time), then the
    // ambient scope goes away — the renewal must still send the latched value.
    const capabilityReads = ["cap-live", undefined, undefined];
    let sessionReads = 0;
    const client = zoStateSandbox(WORKSPACE, {
      apiBaseUrl: "http://api.test",
      fetch: broker.fetch,
      agentToken: "agt-token",
      ambientParent: () => null,
      ambientSessionId: () => {
        sessionReads += 1;
        return sessionReads === 1 ? null : "wrun_current";
      },
      ambientCapability: () => capabilityReads.shift(),
      createSession: () => Promise.resolve(fake.session),
    });

    await client.exec("first");
    await client.exec("second");

    expect(broker.requests).toHaveLength(2);
    // Construction read the capability first (cap-live) and latched it; the
    // renewal — whose ambient read now returns undefined — sends the same.
    expect(broker.requests[0]?.headers["x-zo-session-capability"]).toBe("cap-live");
    expect(broker.requests[1]?.headers["x-zo-session-capability"]).toBe("cap-live");
    // The session key resolved on the first mint (construction read was null)
    // and stays identical across the renewal.
    expect(broker.requests[0]?.headers["x-zo-eve-session"]).toBe("wrun_current");
    expect(broker.requests[1]?.headers["x-zo-eve-session"]).toBe("wrun_current");
  });

  test("handle renewal keeps store, partition, and root path from the fresh handle without re-deriving identity", async () => {
    const expired = handleJson({
      sandbox: {
        sandboxId: "dtn_1",
        sshHost: "ssh.example.test",
        sshUser: "token-old",
        expiresAt: new Date(Date.now() - 1_000).toISOString(),
      },
    });
    const broker = brokerFake([
      { status: 200, json: expired },
      { status: 200, json: handleJson() },
    ]);
    const sessions: ReturnType<typeof fakeSession>[] = [];
    const client = zoStateSandbox(WORKSPACE, {
      apiBaseUrl: "http://api.test",
      fetch: broker.fetch,
      agentToken: "agt-token",
      ambientParent: () => null,
      ambientSessionId: () => "wrun_current",
      ambientCapability: () => undefined,
      createSession: () => {
        const s = fakeSession();
        sessions.push(s);
        return Promise.resolve(s.session);
      },
    });
    await client.exec("a");
    await client.exec("b");
    expect(broker.requests).toHaveLength(2);
    expect(broker.requests[1]?.body).toEqual(broker.requests[0]?.body);
    expect(sessions).toHaveLength(2);
    // The superseded session was disposed when the renewal swapped it out.
    expect(sessions[0]?.disposed()).toBe(true);
  });
});

describe("the R7 ambient-env gate", () => {
  const AMBIENT = { SECRET_TOKEN: "shh" };

  async function execEnv(
    declaration: ExternalStateDeclaration,
    partition: string,
  ): Promise<Record<string, string> | undefined> {
    const broker = brokerFake([
      {
        status: 200,
        json: handleJson({ declarationName: declaration.name, partition }),
      },
    ]);
    const fake = fakeSession();
    const client = zoStateSandbox(declaration, {
      apiBaseUrl: "http://api.test",
      fetch: broker.fetch,
      agentToken: "agt-token",
      ambientParent: () => null,
      ambientSessionId: () => "wrun_current",
      ambientCapability: () => undefined,
      ambientEnv: AMBIENT,
      createSession: () => Promise.resolve(fake.session),
    });
    await client.exec("env");
    const options = fake.calls[0]?.options as { env?: Record<string, string> };
    return options.env;
  }

  test("the canonical scratch declaration on a session handle receives ambient env", async () => {
    const scratch: ExternalStateDeclaration = {
      name: "scratch",
      interface: "exec",
      access: "rw",
      intent: "private",
      suggestedDefaults: { engine: "sandbox-daytona", partition: "session" },
    };
    expect(await execEnv(scratch, "session")).toEqual(AMBIENT);
  });

  test("another session-partitioned declaration receives a clean environment", async () => {
    const sessionDecl: ExternalStateDeclaration = {
      name: "workbench",
      interface: "exec",
      access: "rw",
      intent: "private",
      suggestedDefaults: { engine: "sandbox-daytona", partition: "session" },
    };
    expect(await execEnv(sessionDecl, "session")).toBeUndefined();
  });

  test("scratch on a durable handle receives a clean environment", async () => {
    const scratch: ExternalStateDeclaration = {
      name: "scratch",
      interface: "exec",
      access: "rw",
      intent: "private",
    };
    expect(await execEnv(scratch, "user")).toBeUndefined();
  });
});

describe("typed broker failures pass through", () => {
  test("a consent_required 409 surfaces the envelope on the typed error", async () => {
    const broker = brokerFake([
      {
        status: 409,
        json: {
          error: "consent_required",
          message: "consent required",
          bindingId: "stb_1",
          declarationName: "workspace",
          resourceName: "workspace",
          party: { handle: "the team", external: false },
        },
      },
    ]);
    const client = zoStateSandbox(WORKSPACE, {
      apiBaseUrl: "http://api.test",
      fetch: broker.fetch,
      agentToken: "agt-token",
      ambientParent: () => null,
      ambientSessionId: () => "wrun_current",
      ambientCapability: () => undefined,
      createSession: () => Promise.reject(new Error("must not connect")),
    });
    const error = await client.exec("true").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StateSandboxHandleError);
    const typed = error as StateSandboxHandleError;
    expect(typed.status).toBe(409);
    expect(typed.code).toBe("consent_required");
    expect(typed.consent?.bindingId).toBe("stb_1");
  });

  test("a malformed handle is a typed error, not a crash", async () => {
    const broker = brokerFake([{ status: 200, json: { nope: true } }]);
    const client = zoStateSandbox(WORKSPACE, {
      apiBaseUrl: "http://api.test",
      fetch: broker.fetch,
      agentToken: "agt-token",
      ambientParent: () => null,
      ambientSessionId: () => "wrun_current",
      ambientCapability: () => undefined,
      createSession: () => Promise.reject(new Error("must not connect")),
    });
    const error = await client.exec("true").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StateSandboxHandleError);
    expect((error as StateSandboxHandleError).code).toBe("malformed_handle");
  });
});

describe("session delegation details", () => {
  test("spawn adapts to the streaming contract and read-only handles refuse writes", async () => {
    const broker = brokerFake([
      { status: 200, json: handleJson({ access: "r", interface: "files" }) },
    ]);
    const fake = fakeSession();
    const client = zoStateSandbox(
      { name: "workspace", interface: "files", access: "r", intent: "private" },
      {
        apiBaseUrl: "http://api.test",
        fetch: broker.fetch,
        agentToken: "agt-token",
        ambientParent: () => null,
        ambientSessionId: () => "wrun_current",
        ambientCapability: () => undefined,
        createSession: () => Promise.resolve(fake.session),
      },
    );
    await expect(client.files.write("a.txt", "x")).rejects.toThrow(/read-only/);
    await expect(client.exec("true")).rejects.toThrow(/read-only/);
    expect(await client.files.read("a.txt")).not.toBeNull();
  });
});
