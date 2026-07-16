import { describe, expect, test } from "bun:test";
import {
  createRefreshingStateFilesClient,
  createStateFilesClient,
  normalizeStateFilePath,
  parseStateFilesHandle,
  requestStateFilesHandle,
  shouldRefreshStateFilesHandle,
  StateFilesHandleError,
  type StateFilesHandle,
  type StateFilesS3Client,
  type StateFilesS3DeleteInput,
  type StateFilesS3ListInput,
  type StateFilesS3ReadInput,
  type StateFilesS3WriteInput,
} from "./state-files";

const BASE_HANDLE: StateFilesHandle = Object.freeze({
  handleId: "hnd_123",
  declarationName: "notes",
  interface: "files",
  access: "rw",
  engine: "zo-blob-r2",
  storeId: "store_123",
  stateInstanceId: "inst_123",
  partition: "user",
  bucketName: "bucket-notes",
  endpoint: "https://example.r2.cloudflarestorage.com",
  credentials: Object.freeze({
    accessKeyId: "temp-access-key-id",
    secretAccessKey: "temp-secret-access-key",
    sessionToken: "temp-session-token",
    expiresAt: "2026-07-05T22:00:00.000Z",
  }),
});

function readonlyHandle(): StateFilesHandle {
  return { ...BASE_HANDLE, access: "r" };
}

function createRecordingS3(): {
  readonly s3: StateFilesS3Client;
  readonly listCalls: StateFilesS3ListInput[];
  readonly readCalls: StateFilesS3ReadInput[];
  readonly writeCalls: StateFilesS3WriteInput[];
  readonly deleteCalls: StateFilesS3DeleteInput[];
} {
  const listCalls: StateFilesS3ListInput[] = [];
  const readCalls: StateFilesS3ReadInput[] = [];
  const writeCalls: StateFilesS3WriteInput[] = [];
  const deleteCalls: StateFilesS3DeleteInput[] = [];
  return {
    listCalls,
    readCalls,
    writeCalls,
    deleteCalls,
    s3: {
      async listObjects(input) {
        listCalls.push(input);
        return [{ key: "notes/today.md", size: 12 }];
      },
      async readObject(input) {
        readCalls.push(input);
        return new Uint8Array([1, 2, 3]);
      },
      async writeObject(input) {
        writeCalls.push(input);
      },
      async deleteObject(input) {
        deleteCalls.push(input);
      },
    },
  };
}

describe("parseStateFilesHandle", () => {
  test("accepts the broker handle and omits unrelated parent credential fields", () => {
    const handle = parseStateFilesHandle({
      ...BASE_HANDLE,
      parentAccessKeyId: "must-not-surface",
      credentials: { ...BASE_HANDLE.credentials },
    });
    expect(handle).not.toBeNull();
    expect(handle?.handleId).toBe("hnd_123");
    expect(handle?.partition).toBe("user");
    expect(Object.keys(handle ?? {})).not.toContain("parentAccessKeyId");
  });

  test("rejects malformed handles", () => {
    expect(parseStateFilesHandle({ ...BASE_HANDLE, engine: "other" })).toBeNull();
    expect(parseStateFilesHandle({ ...BASE_HANDLE, partition: "org" })).toBeNull();
    expect(
      parseStateFilesHandle({
        ...BASE_HANDLE,
        credentials: { ...BASE_HANDLE.credentials, expiresAt: "not-a-date" },
      }),
    ).toBeNull();
  });
});

describe("requestStateFilesHandle", () => {
  test("posts the handle request with agent headers", async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const handle = await requestStateFilesHandle({
      apiBaseUrl: "https://api.example.test/runtime",
      declarationName: "notes",
      access: "rw",
      agentToken: "agent-token",
      eveSessionKey: "eve-session",
      sessionCapability: "session-capability",
      async fetch(input, init) {
        calls.push({ url: String(input), init });
        return Response.json(BASE_HANDLE);
      },
    });
    expect(handle.handleId).toBe("hnd_123");
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call).toBeDefined();
    expect(call?.url).toBe("https://api.example.test/runtime/state/handles");
    expect(call?.init?.method).toBe("POST");
    const headers = new Headers(call?.init?.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-zo-agent-token")).toBe("agent-token");
    expect(headers.get("x-zo-eve-session")).toBe("eve-session");
    expect(headers.get("x-zo-session-capability")).toBe("session-capability");
    expect(JSON.parse(String(call?.init?.body))).toEqual({
      declarationName: "notes",
      interface: "files",
      access: "rw",
    });
  });

  test("raises typed broker errors", async () => {
    await expect(
      requestStateFilesHandle({
        apiBaseUrl: "https://api.example.test",
        declarationName: "notes",
        access: "r",
        async fetch() {
          return Response.json(
            { error: { code: "agent_actor_required", message: "agent actor required" } },
            { status: 409 },
          );
        },
      }),
    ).rejects.toMatchObject({
      name: "StateFilesHandleError",
      status: 409,
      code: "agent_actor_required",
      message: "agent actor required",
    } satisfies Partial<StateFilesHandleError>);
  });

  test("preserves every top-level route error kind", async () => {
    const codes = [
      "unsupported_actor",
      "eve_session_required",
      "deployment_required",
      "subject_unresolved",
      "consent_required",
      "binding_revoked",
      "binding_store_missing",
      "access_denied",
      "unsupported_interface",
      "unsupported_engine",
      "provider_unconfigured",
      "zero_config_failed",
      "provisioning_failed",
    ] as const;

    for (const code of codes) {
      await expect(
        requestStateFilesHandle({
          apiBaseUrl: new URL("https://api.example.test/runtime/"),
          declarationName: "notes",
          access: "rw",
          async fetch() {
            return Response.json({ error: code, declarationName: "notes", storeId: "sto_1" }, { status: 409 });
          },
        }),
      ).rejects.toMatchObject({
        name: "StateFilesHandleError",
        status: 409,
        code,
        message: "state files broker request failed",
      } satisfies Partial<StateFilesHandleError>);
    }
  });
});

describe("createStateFilesClient", () => {
  test("passes scoped handle fields to the S3 boundary", async () => {
    const recording = createRecordingS3();
    const client = createStateFilesClient({ handle: BASE_HANDLE, s3: recording.s3 });
    await expect(client.list("notes/")).resolves.toEqual([{ key: "notes/today.md", size: 12 }]);
    await expect(client.read("notes/today.md")).resolves.toEqual(new Uint8Array([1, 2, 3]));
    await client.write("notes/tomorrow.md", "hello", { contentType: "text/markdown" });
    await client.delete("notes/old.md");
    expect(recording.listCalls[0]).toEqual({
      endpoint: BASE_HANDLE.endpoint,
      bucketName: BASE_HANDLE.bucketName,
      credentials: BASE_HANDLE.credentials,
      prefix: "notes/",
    });
    expect(recording.readCalls[0]?.key).toBe("notes/today.md");
    expect(recording.writeCalls[0]?.key).toBe("notes/tomorrow.md");
    expect(recording.writeCalls[0]?.contentType).toBe("text/markdown");
    expect(recording.deleteCalls[0]?.key).toBe("notes/old.md");
  });

  test("refuses writes with read-only handles before touching S3", async () => {
    const recording = createRecordingS3();
    const client = createStateFilesClient({ handle: readonlyHandle(), s3: recording.s3 });
    await expect(client.write("notes/today.md", "hello")).rejects.toThrow(/read-only/);
    await expect(client.delete("notes/today.md")).rejects.toThrow(/read-only/);
    expect(recording.writeCalls).toHaveLength(0);
    expect(recording.deleteCalls).toHaveLength(0);
  });

  test("rejects absolute and traversal paths", () => {
    expect(() => normalizeStateFilePath("notes/today.md")).not.toThrow();
    expect(() => normalizeStateFilePath("/notes/today.md")).toThrow(/relative/);
    expect(() => normalizeStateFilePath("notes/../secret.md")).toThrow(/must not contain/);
    expect(() => normalizeStateFilePath("notes//today.md")).toThrow(/must not contain/);
  });
});

describe("createRefreshingStateFilesClient", () => {
  test("reloads when the cached handle is inside the refresh window", async () => {
    const recording = createRecordingS3();
    const handles = [
      { ...BASE_HANDLE, handleId: "hnd_old", credentials: { ...BASE_HANDLE.credentials, expiresAt: "2026-07-05T22:00:30.000Z" } },
      { ...BASE_HANDLE, handleId: "hnd_new", credentials: { ...BASE_HANDLE.credentials, expiresAt: "2026-07-05T23:00:00.000Z" } },
    ];
    let loadCount = 0;
    let now = new Date("2026-07-05T22:00:00.000Z");
    const client = createRefreshingStateFilesClient({
      s3: recording.s3,
      now: () => now,
      refreshWindowMs: 60_000,
      async loadHandle() {
        const handle = handles[loadCount];
        loadCount += 1;
        if (handle === undefined) {
          throw new Error("unexpected handle load");
        }
        return handle;
      },
    });
    await client.read("notes/first.md");
    now = new Date("2026-07-05T22:10:00.000Z");
    await client.read("notes/second.md");
    expect(loadCount).toBe(2);
    expect(recording.readCalls[0]?.credentials.expiresAt).toBe("2026-07-05T22:00:30.000Z");
    expect(recording.readCalls[1]?.credentials.expiresAt).toBe("2026-07-05T23:00:00.000Z");
  });

  test("does not reload handles outside the refresh window", async () => {
    const recording = createRecordingS3();
    let loadCount = 0;
    const client = createRefreshingStateFilesClient({
      s3: recording.s3,
      now: () => new Date("2026-07-05T21:00:00.000Z"),
      async loadHandle() {
        loadCount += 1;
        return BASE_HANDLE;
      },
    });
    await client.read("notes/first.md");
    await client.read("notes/second.md");
    expect(loadCount).toBe(1);
  });
});

describe("shouldRefreshStateFilesHandle", () => {
  test("returns true for malformed expiry dates", () => {
    expect(
      shouldRefreshStateFilesHandle(
        { ...BASE_HANDLE, credentials: { ...BASE_HANDLE.credentials, expiresAt: "bad-date" } },
        new Date("2026-07-05T21:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
