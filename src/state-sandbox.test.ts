import { describe, expect, test } from "bun:test";
import {
  createStateSandboxClient,
  parseStateSandboxHandle,
  requestStateSandboxHandle,
  shouldRefreshStateSandboxHandle,
  StateSandboxHandleError,
  type StateSandboxHandle,
  type StateSandboxRunResult,
  type StateSandboxSessionLike,
  type StateSandboxSpawnedProcess,
} from "./state-sandbox";

const baseHandle: StateSandboxHandle = Object.freeze({
  handleId: "hnd_sandbox_1",
  declarationName: "workspace",
  interface: "exec",
  access: "rw",
  engine: "sandbox-daytona",
  storeId: "store_1",
  stateInstanceId: "state_1",
  partition: "session",
  sandboxResourceId: "sr_1",
  rootPath: "/home/daytona/agent/state/workspace",
  lifecycle: "ready",
  sandbox: Object.freeze({
    sandboxId: "sbx_1",
    sshHost: "sbx.example.test",
    sshUser: "scoped-token",
    expiresAt: "2026-07-05T22:00:00.000Z",
  }),
});

function handle(
  overrides: Partial<StateSandboxHandle> = {},
): StateSandboxHandle {
  return Object.freeze({ ...baseHandle, ...overrides });
}

function spawned(): StateSandboxSpawnedProcess {
  return {
    stdout: emptyBytes(),
    stderr: emptyBytes(),
    exitCode: Promise.resolve(0),
    kill: () => undefined,
  };
}

async function* emptyBytes(): AsyncIterable<Uint8Array> {
  // AsyncIterable marker for tests; no chunks needed.
}

interface FakeSessionLog {
  readonly runs: Array<Record<string, unknown>>;
  readonly spawns: Array<Record<string, unknown>>;
  readonly reads: string[];
  readonly writes: Array<{ path: string; content: Uint8Array }>;
  readonly deletes: Array<Record<string, unknown>>;
  disposed: number;
}

function createFakeSession(log: FakeSessionLog): StateSandboxSessionLike {
  return {
    async run(options) {
      log.runs.push(options);
      return { exitCode: 0, stdout: "ok", stderr: "" };
    },
    async spawn(options) {
      log.spawns.push(options);
      return spawned();
    },
    async readBinaryFile({ path }) {
      log.reads.push(path);
      return new TextEncoder().encode("read");
    },
    async writeBinaryFile({ path, content }) {
      log.writes.push({ path, content });
    },
    async removePath(options) {
      log.deletes.push(options);
    },
    async dispose() {
      log.disposed += 1;
    },
  };
}

function createLog(): FakeSessionLog {
  return {
    runs: [],
    spawns: [],
    reads: [],
    writes: [],
    deletes: [],
    disposed: 0,
  };
}

describe("requestStateSandboxHandle", () => {
  test("posts the broker contract with Zo auth headers", async () => {
    let seenUrl = "";
    let seenInit: RequestInit | undefined;
    const fetched = requestStateSandboxHandle({
      fetch: async (input, init) => {
        seenUrl = String(input);
        seenInit = init;
        return Response.json(baseHandle);
      },
      apiBaseUrl: "https://api.example.test/base/",
      declarationName: "workspace",
      interface: "exec",
      access: "rw",
      agentToken: "agent-token",
      eveSessionKey: "eve-session",
      sessionCapability: "signed-session-capability",
      headers: { "x-extra": "kept", "content-type": "ignored" },
      suggestedDefaults: { partition: "team" },
    });

    await expect(fetched).resolves.toEqual(baseHandle);
    expect(seenUrl).toBe("https://api.example.test/base/state/handles");
    expect(seenInit?.method).toBe("POST");
    const headers = seenInit?.headers;
    if (!(headers instanceof Headers)) throw new Error("expected Headers");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-zo-agent-token")).toBe("agent-token");
    expect(headers.get("x-zo-eve-session")).toBe("eve-session");
    expect(headers.get("x-zo-session-capability")).toBe(
      "signed-session-capability",
    );
    expect(headers.get("x-extra")).toBe("kept");
    expect(JSON.parse(String(seenInit?.body))).toEqual({
      declarationName: "workspace",
      interface: "exec",
      access: "rw",
      suggestedDefaults: { engine: "sandbox-daytona", partition: "team" },
    });
  });

  test("sends sandbox-daytona as the zero-config engine hint by default", async () => {
    let body: unknown;
    await requestStateSandboxHandle({
      fetch: async (_input, init) => {
        body = JSON.parse(String(init?.body));
        return Response.json(baseHandle);
      },
      apiBaseUrl: "https://api.example.test",
      declarationName: "workspace",
      interface: "exec",
      access: "rw",
    });

    expect(body).toEqual({
      declarationName: "workspace",
      interface: "exec",
      access: "rw",
      suggestedDefaults: { engine: "sandbox-daytona" },
    });
  });

  test("throws broker errors with status and code", async () => {
    const err = requestStateSandboxHandle({
      fetch: async () =>
        Response.json(
          { error: "not_allowed", message: "denied" },
          { status: 403 },
        ),
      apiBaseUrl: "https://api.example.test",
      declarationName: "workspace",
      interface: "exec",
      access: "rw",
    });
    await expect(err).rejects.toThrow("denied");
    try {
      await err;
    } catch (caught) {
      expect(caught).toBeInstanceOf(StateSandboxHandleError);
      expect((caught as StateSandboxHandleError).status).toBe(403);
      expect((caught as StateSandboxHandleError).code).toBe("not_allowed");
    }
  });
});

describe("parseStateSandboxHandle", () => {
  test("accepts a broker handle and freezes the parsed value", () => {
    const parsed = parseStateSandboxHandle(baseHandle);
    expect(parsed).toEqual(baseHandle);
    expect(Object.isFrozen(parsed)).toBe(true);
  });

  test("rejects malformed secrets, non-sandbox engines, and relative roots", () => {
    expect(
      parseStateSandboxHandle({ ...baseHandle, engine: "zo-blob-r2" }),
    ).toBeNull();
    expect(
      parseStateSandboxHandle({ ...baseHandle, rootPath: "relative" }),
    ).toBeNull();
    expect(
      parseStateSandboxHandle({
        ...baseHandle,
        sandbox: { ...baseHandle.sandbox, expiresAt: "not-a-date" },
      }),
    ).toBeNull();
  });

  test("parses resuming lifecycle from lifecycle or status", () => {
    expect(
      parseStateSandboxHandle({ ...baseHandle, lifecycle: "resuming" })
        ?.lifecycle,
    ).toBe("resuming");
    expect(
      parseStateSandboxHandle({
        ...baseHandle,
        lifecycle: undefined,
        status: "resuming",
      })?.lifecycle,
    ).toBe("resuming");
  });
});

describe("createStateSandboxClient", () => {
  test("exec, spawn, and files delegate under the handle root path", async () => {
    const log = createLog();
    const client = createStateSandboxClient({
      loadHandle: async () => baseHandle,
      createSession: async () => createFakeSession(log),
      now: () => new Date("2026-07-05T21:00:00.000Z"),
    });

    await expect(client.exec("pwd")).resolves.toEqual({
      exitCode: 0,
      stdout: "ok",
      stderr: "",
    });
    await client.spawn("npm test", { workingDirectory: "subdir" });
    await expect(client.files.read("data/in.txt")).resolves.toEqual(
      new TextEncoder().encode("read"),
    );
    await client.files.write("data/out.txt", "written");
    await client.files.delete("data/out.txt", { force: true });

    expect(log.runs).toEqual([
      {
        command: "pwd",
        workingDirectory: "/home/daytona/agent/state/workspace",
      },
    ]);
    expect(log.spawns).toEqual([
      {
        command: "npm test",
        workingDirectory: "/home/daytona/agent/state/workspace/subdir",
      },
    ]);
    expect(log.reads).toEqual([
      "/home/daytona/agent/state/workspace/data/in.txt",
    ]);
    expect(log.writes).toHaveLength(1);
    expect(log.writes[0]?.path).toBe(
      "/home/daytona/agent/state/workspace/data/out.txt",
    );
    expect(new TextDecoder().decode(log.writes[0]?.content)).toBe("written");
    expect(log.deletes).toEqual([
      { path: "/home/daytona/agent/state/workspace/data/out.txt", force: true },
    ]);
  });

  test("durable shared exec runs with clean env even when ambient env is available", async () => {
    const log = createLog();
    const client = createStateSandboxClient({
      loadHandle: async () => handle({ partition: "team" }),
      createSession: async () => createFakeSession(log),
      now: () => new Date("2026-07-05T21:00:00.000Z"),
      ambientEnv: { ZO_STATE_HANDLE: "secret", PATH: "/usr/bin" },
      passAmbientEnvToSessionPartition: true,
    });

    await client.exec("env");
    expect(log.runs).toEqual([
      {
        command: "env",
        workingDirectory: "/home/daytona/agent/state/workspace",
      },
    ]);
  });

  test("session-scratch exec can preserve ambient env with explicit opt-in", async () => {
    const log = createLog();
    const client = createStateSandboxClient({
      loadHandle: async () => handle({ partition: "session" }),
      createSession: async () => createFakeSession(log),
      now: () => new Date("2026-07-05T21:00:00.000Z"),
      ambientEnv: { PATH: "/usr/bin", ZO_AGENT_TOKEN: "ambient" },
      passAmbientEnvToSessionPartition: true,
    });

    await client.exec("env", { env: { EXTRA: "1" } });
    expect(log.runs).toEqual([
      {
        command: "env",
        workingDirectory: "/home/daytona/agent/state/workspace",
        env: { PATH: "/usr/bin", ZO_AGENT_TOKEN: "ambient", EXTRA: "1" },
      },
    ]);
  });

  test("rejects escaping file paths and working directories", async () => {
    const client = createStateSandboxClient({
      loadHandle: async () => baseHandle,
      createSession: async () => createFakeSession(createLog()),
      now: () => new Date("2026-07-05T21:00:00.000Z"),
    });

    await expect(client.files.read("../secret.txt")).rejects.toThrow(
      /must not contain/,
    );
    await expect(
      client.exec("pwd", { workingDirectory: "/tmp" }),
    ).rejects.toThrow(/must be relative/);
  });

  test("enforces read-only handles for mutating operations but permits reads", async () => {
    const readOnly = handle({ access: "r" });
    const client = createStateSandboxClient({
      loadHandle: async () => readOnly,
      createSession: async () => createFakeSession(createLog()),
      now: () => new Date("2026-07-05T21:00:00.000Z"),
    });

    await expect(client.files.read("data/in.txt")).resolves.toEqual(
      new TextEncoder().encode("read"),
    );
    await expect(client.files.write("data/out.txt", "x")).rejects.toThrow(
      /read-only/,
    );
    await expect(client.exec("touch x")).rejects.toThrow(/read-only/);
    await expect(client.spawn("touch x")).rejects.toThrow(/read-only/);
  });

  test("coalesces concurrent first-use session creation", async () => {
    const release = Promise.withResolvers<StateSandboxSessionLike>();
    const log = createLog();
    let loads = 0;
    let sessions = 0;
    const client = createStateSandboxClient({
      loadHandle: async () => {
        loads += 1;
        return baseHandle;
      },
      createSession: async () => {
        sessions += 1;
        return await release.promise;
      },
      now: () => new Date("2026-07-05T21:00:00.000Z"),
    });

    const first = client.exec("one");
    const second = client.exec("two");
    await Promise.resolve();
    release.resolve(createFakeSession(log));

    await expect(first).resolves.toEqual({
      exitCode: 0,
      stdout: "ok",
      stderr: "",
    });
    await expect(second).resolves.toEqual({
      exitCode: 0,
      stdout: "ok",
      stderr: "",
    });
    expect(loads).toBe(1);
    expect(sessions).toBe(1);
    expect(log.runs.map((run) => run.command)).toEqual(["one", "two"]);
  });

  test("surfaces resuming status while creating the first session", async () => {
    const release = Promise.withResolvers<StateSandboxSessionLike>();
    const log = createLog();
    const client = createStateSandboxClient({
      loadHandle: async () => handle({ lifecycle: "resuming" }),
      createSession: () => release.promise,
      now: () => new Date("2026-07-05T21:00:00.000Z"),
    });

    const pending = client.exec("pwd");
    await Promise.resolve();
    expect(client.status()).toEqual({
      status: "resuming",
      handleId: "hnd_sandbox_1",
    });
    release.resolve(createFakeSession(log));
    await expect(pending).resolves.toEqual({
      exitCode: 0,
      stdout: "ok",
      stderr: "",
    });
    expect(client.status()).toEqual({
      status: "ready",
      handleId: "hnd_sandbox_1",
    });
  });

  test("keeps status non-ready when first session creation fails", async () => {
    const client = createStateSandboxClient({
      loadHandle: async () => baseHandle,
      createSession: async () => {
        throw new Error("ssh unavailable");
      },
      now: () => new Date("2026-07-05T21:00:00.000Z"),
    });

    await expect(client.exec("pwd")).rejects.toThrow("ssh unavailable");
    expect(client.status()).toEqual({ status: "idle" });
  });

  test("keeps an active old session alive while refreshing", async () => {
    const firstRunRelease = Promise.withResolvers<StateSandboxRunResult>();
    const logs = [createLog(), createLog()];
    let now = new Date("2026-07-05T21:00:00.000Z");
    let loads = 0;
    const firstSession: StateSandboxSessionLike = {
      ...createFakeSession(logs[0] ?? createLog()),
      async run(options) {
        logs[0]?.runs.push(options);
        return await firstRunRelease.promise;
      },
    };
    const secondSession = createFakeSession(logs[1] ?? createLog());
    const client = createStateSandboxClient({
      loadHandle: async () => {
        loads += 1;
        return handle({
          handleId: `hnd_sandbox_${loads}`,
          sandbox: {
            ...baseHandle.sandbox,
            expiresAt: `2026-07-05T21:0${loads}:30.000Z`,
          },
        });
      },
      createSession: async () => (loads === 1 ? firstSession : secondSession),
      now: () => now,
      refreshWindowMs: 60_000,
    });

    const first = client.exec("first");
    await Promise.resolve();
    await Promise.resolve();
    expect(loads).toBe(1);
    now = new Date("2026-07-05T21:01:00.000Z");
    const second = client.exec("second");
    await Promise.resolve();
    await Promise.resolve();

    expect(loads).toBe(2);
    expect(logs[0]?.disposed).toBe(0);
    await expect(second).resolves.toEqual({
      exitCode: 0,
      stdout: "ok",
      stderr: "",
    });
    expect(logs[0]?.disposed).toBe(0);
    firstRunRelease.resolve({ exitCode: 0, stdout: "done", stderr: "" });
    await expect(first).resolves.toEqual({
      exitCode: 0,
      stdout: "done",
      stderr: "",
    });
    expect(logs[0]?.disposed).toBe(1);
    expect(logs[0]?.runs.map((run) => run.command)).toEqual(["first"]);
    expect(logs[1]?.runs.map((run) => run.command)).toEqual(["second"]);
  });

  test("refreshes before expiry and disposes the old session", async () => {
    const logs = [createLog(), createLog()];
    let now = new Date("2026-07-05T21:00:00.000Z");
    let loads = 0;
    const client = createStateSandboxClient({
      loadHandle: async () => {
        loads += 1;
        return handle({
          handleId: `hnd_sandbox_${loads}`,
          sandbox: {
            ...baseHandle.sandbox,
            expiresAt: `2026-07-05T21:0${loads}:30.000Z`,
          },
        });
      },
      createSession: async () =>
        createFakeSession(logs[loads - 1] ?? createLog()),
      now: () => now,
      refreshWindowMs: 60_000,
    });

    await client.exec("first");
    now = new Date("2026-07-05T21:01:00.000Z");
    await client.exec("second");

    expect(loads).toBe(2);
    expect(logs[0]?.disposed).toBe(1);
    expect(logs[0]?.runs.map((run) => run.command)).toEqual(["first"]);
    expect(logs[1]?.runs.map((run) => run.command)).toEqual(["second"]);
  });

  test("dispose resets status and disposes the live session", async () => {
    const log = createLog();
    const client = createStateSandboxClient({
      loadHandle: async () => baseHandle,
      createSession: async () => createFakeSession(log),
      now: () => new Date("2026-07-05T21:00:00.000Z"),
    });
    await client.exec("pwd");
    await client.dispose();
    expect(log.disposed).toBe(1);
    expect(client.status()).toEqual({ status: "idle" });
  });
});

describe("shouldRefreshStateSandboxHandle", () => {
  test("refreshes inside the configured window or on invalid expiry", () => {
    expect(
      shouldRefreshStateSandboxHandle(
        baseHandle,
        new Date("2026-07-05T21:58:30.000Z"),
        60_000,
      ),
    ).toBe(false);
    expect(
      shouldRefreshStateSandboxHandle(
        baseHandle,
        new Date("2026-07-05T21:59:30.000Z"),
        60_000,
      ),
    ).toBe(true);
    expect(
      shouldRefreshStateSandboxHandle(
        handle({ sandbox: { ...baseHandle.sandbox, expiresAt: "invalid" } }),
        new Date("2026-07-05T21:00:00.000Z"),
      ),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The U4 lease renewal loop: while work is live (an operation in flight or a
// spawned process running) the client re-mints its handle on an interval so
// the control-plane access lease stays renewed; a denial terminates the local
// path; an idle or disposed client stops renewing (sweep-eligible).
// ─────────────────────────────────────────────────────────────────────────────
describe("lease renewal while work is live", () => {
  function renewalHandle(): StateSandboxHandle {
    const parsed = parseStateSandboxHandle({
      handleId: "h_renew",
      declarationName: "workspace",
      interface: "exec",
      access: "rw",
      engine: "sandbox-daytona",
      storeId: "sto_1",
      stateInstanceId: "sti_1",
      partition: "user",
      sandboxResourceId: "sbr_1",
      rootPath: "/root",
      lifecycle: "ready",
      sandbox: {
        sandboxId: "sbx_1",
        sshHost: "host",
        sshUser: "token",
        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      },
    });
    if (parsed === null) throw new Error("expected a valid handle");
    return parsed;
  }

  function spawnableSession(): {
    session: StateSandboxSessionLike;
    exit: (code: number) => void;
    kills: string[];
  } {
    let resolveExit: (code: number) => void = () => {};
    const kills: string[] = [];
    const exitCode = new Promise<number>((resolve) => {
      resolveExit = resolve;
    });
    const session: StateSandboxSessionLike = {
      run: () => Promise.resolve({ exitCode: 0, stdout: "", stderr: "" }),
      spawn: () =>
        Promise.resolve({
          stdout: (async function* () {})(),
          stderr: (async function* () {})(),
          exitCode,
          kill: (signal?: string) => {
            kills.push(signal ?? "default");
            resolveExit(137);
          },
        }),
      readBinaryFile: () => Promise.resolve(null),
      writeBinaryFile: () => Promise.resolve(),
      removePath: () => Promise.resolve(),
    };
    return { session, exit: (code) => resolveExit(code), kills };
  }

  const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  test("a live spawned process renews the lease on the interval and stops after terminal exit", async () => {
    let mints = 0;
    const fake = spawnableSession();
    const client = createStateSandboxClient({
      loadHandle: () => {
        mints += 1;
        return Promise.resolve(renewalHandle());
      },
      createSession: () => Promise.resolve(fake.session),
      renewIntervalMs: 10,
    });

    const process = await client.spawn("sleep 999");
    const afterSpawn = mints; // the initial mint
    await tick(45);
    expect(mints).toBeGreaterThan(afterSpawn); // renewals while the spawn lives
    fake.exit(0);
    expect(await process.exitCode).toBe(0);
    const atExit = mints;
    await tick(40);
    expect(mints).toBe(atExit); // renewals stop once work ends
    await client.dispose();
  });

  test("a renewal denial (revoked binding) kills live processes and drops the session", async () => {
    let mints = 0;
    const fake = spawnableSession();
    const client = createStateSandboxClient({
      loadHandle: () => {
        mints += 1;
        if (mints > 1) {
          return Promise.reject(
            new StateSandboxHandleError("binding revoked", { status: 409, code: "binding_revoked" }),
          );
        }
        return Promise.resolve(renewalHandle());
      },
      createSession: () => Promise.resolve(fake.session),
      renewIntervalMs: 10,
    });

    const process = await client.spawn("serve");
    await tick(40);
    expect(fake.kills.length).toBeGreaterThan(0); // terminated on denial
    expect(await process.exitCode).toBe(137);
    expect(client.status()).toEqual({ status: "idle" });
  });

  test("a transient renewal failure keeps renewing (no termination)", async () => {
    let mints = 0;
    const fake = spawnableSession();
    const client = createStateSandboxClient({
      loadHandle: () => {
        mints += 1;
        if (mints === 2) return Promise.reject(new Error("network blip"));
        return Promise.resolve(renewalHandle());
      },
      createSession: () => Promise.resolve(fake.session),
      renewIntervalMs: 10,
    });
    await client.spawn("job");
    await tick(50);
    expect(fake.kills).toHaveLength(0);
    expect(mints).toBeGreaterThan(2); // kept going past the blip
    fake.exit(0);
    await client.dispose();
  });

  test("a retryable 409 (instance transitioning) never kills live work — it backs off and keeps renewing", async () => {
    let mints = 0;
    const fake = spawnableSession();
    const client = createStateSandboxClient({
      loadHandle: () => {
        mints += 1;
        if (mints === 2) {
          return Promise.reject(
            new StateSandboxHandleError("instance is transitioning; retry shortly", {
              status: 409,
              code: "instance_transitioning",
            }),
          );
        }
        return Promise.resolve(renewalHandle());
      },
      createSession: () => Promise.resolve(fake.session),
      renewIntervalMs: 10,
    });
    const process = await client.spawn("serve");
    await tick(60);
    expect(fake.kills).toHaveLength(0); // a lifecycle transition is not a revocation
    expect(mints).toBeGreaterThan(2); // renewal resumed past the transition
    fake.exit(0);
    expect(await process.exitCode).toBe(0);
    await client.dispose();
  });

  test("work starting late in a cached handle's life renews immediately (mint-anchored, not work-anchored)", async () => {
    let mints = 0;
    const fake = spawnableSession();
    const client = createStateSandboxClient({
      loadHandle: () => {
        mints += 1;
        return Promise.resolve(renewalHandle());
      },
      createSession: () => Promise.resolve(fake.session),
      renewIntervalMs: 60,
    });
    await client.exec("true"); // mints the handle, then goes idle
    expect(mints).toBe(1);
    await tick(80); // idle past a full renew interval — no renewals, handle now "old"
    expect(mints).toBe(1);
    await client.spawn("serve");
    await tick(15); // well inside renewIntervalMs
    // Anchored to the stale mint, the renewal fires immediately at work start —
    // a work-start anchor would leave the lease unrenewed for a full interval.
    expect(mints).toBeGreaterThanOrEqual(2);
    fake.exit(0);
    await client.dispose();
  });

  test("an idle client never renews", async () => {
    let mints = 0;
    const client = createStateSandboxClient({
      loadHandle: () => {
        mints += 1;
        return Promise.resolve(renewalHandle());
      },
      createSession: () => Promise.resolve(spawnableSession().session),
      renewIntervalMs: 5,
    });
    await client.exec("true");
    const after = mints;
    await tick(30);
    expect(mints).toBe(after); // no live work → no renewals
    await client.dispose();
  });
});
