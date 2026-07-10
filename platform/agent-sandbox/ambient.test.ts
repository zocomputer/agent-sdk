import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { ambientSessionParent } from "./ambient";

const SLOT = Symbol.for("eve.context-storage");

/** Run with the global storage slot set to `value`, restoring the prior slot after. */
function withSlot<T>(value: unknown, run: () => T): T {
  const had = Reflect.has(globalThis, SLOT);
  const prior: unknown = Reflect.get(globalThis, SLOT);
  Reflect.set(globalThis, SLOT, value);
  try {
    return run();
  } finally {
    if (had) Reflect.set(globalThis, SLOT, prior);
    else Reflect.deleteProperty(globalThis, SLOT);
  }
}

/** A fake storage whose store serves `value` under the lineage key name only. */
function storageOf(value: unknown): unknown {
  return {
    getStore: () => ({
      get: (key: { name: string }) => (key.name === "eve.parentSession" ? value : undefined),
    }),
  };
}

const PARENT = {
  callId: "call_01ABC",
  rootSessionId: "wrun_root",
  sessionId: "wrun_parent",
  turn: { id: "turn_1", sequence: 2 },
};

describe("ambientSessionParent", () => {
  test("returns the lineage slice for a valid seeded parent (turn stripped)", () => {
    expect(withSlot(storageOf(PARENT), () => ambientSessionParent())).toEqual({
      callId: "call_01ABC",
      rootSessionId: "wrun_root",
      sessionId: "wrun_parent",
    });
  });

  test("no storage slot → null", () => {
    const had = Reflect.has(globalThis, SLOT);
    const prior: unknown = Reflect.get(globalThis, SLOT);
    Reflect.deleteProperty(globalThis, SLOT);
    try {
      expect(ambientSessionParent()).toBeNull();
    } finally {
      if (had) Reflect.set(globalThis, SLOT, prior);
    }
  });

  test("outside any ALS scope (getStore returns undefined) → null", () => {
    expect(withSlot({ getStore: () => undefined }, () => ambientSessionParent())).toBeNull();
  });

  test("a store without get (not eve's container shape) → null", () => {
    expect(withSlot({ getStore: () => ({}) }, () => ambientSessionParent())).toBeNull();
  });

  test("no lineage entry (a root session) → null", () => {
    expect(withSlot(storageOf(undefined), () => ambientSessionParent())).toBeNull();
  });

  test("malformed parent shapes → null", () => {
    const cases: unknown[] = [
      null,
      "wrun_root",
      42,
      {},
      { callId: "c", rootSessionId: "r" }, // missing sessionId
      { callId: "c", rootSessionId: 42, sessionId: "s" }, // wrong type
      { callId: "c", rootSessionId: "   ", sessionId: "s" }, // blank id
      { callId: "", rootSessionId: "r", sessionId: "s" }, // empty id
    ];
    for (const value of cases) {
      expect(withSlot(storageOf(value), () => ambientSessionParent())).toBeNull();
    }
  });

  test("never throws — a hostile slot reads as no lineage", () => {
    const throwing = {
      getStore: () => ({
        get: () => {
          throw new Error("boom");
        },
      }),
    };
    expect(withSlot(throwing, () => ambientSessionParent())).toBeNull();
    expect(
      withSlot(
        {
          getStore: () => {
            throw new Error("boom");
          },
        },
        () => ambientSessionParent(),
      ),
    ).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Contract lock against the INSTALLED eve: the ambient read depends on eve's
// process-wide storage slot (`Symbol.for("eve.context-storage")`), its
// container's `get({ name })` shape, and the `eve.parentSession` key name. eve
// doesn't export these publicly, so this test deep-imports eve's own modules by
// file path and drives the REAL container through `ambientSessionParent` — an
// eve upgrade that renames the key or moves the storage fails this test loudly.
// (The same pattern as runtime-ai's session-fetch.test.ts, this module's twin.)
// ─────────────────────────────────────────────────────────────────────────────
describe("eve contract", () => {
  async function eveInternals() {
    const require = createRequire(import.meta.url);
    const evePkg = require.resolve("eve/package.json");
    const eveRoot = dirname(evePkg);
    const containerMod: unknown = await import(
      pathToFileURL(join(eveRoot, "dist/src/context/container.js")).href
    );
    const keysMod: unknown = await import(
      pathToFileURL(join(eveRoot, "dist/src/context/keys.js")).href
    );
    return { containerMod, keysMod };
  }

  test("a SessionParent seeded via eve's real ALS container is read back", async () => {
    const { containerMod, keysMod } = await eveInternals();
    // Runtime-checked reach into eve internals — this is the drift detector.
    const { ContextContainer, contextStorage } = containerMod as {
      ContextContainer: new () => {
        set(key: { name: string }, value: unknown): unknown;
      };
      contextStorage: {
        run<T>(store: unknown, fn: () => T): T;
      };
    };
    const { ParentSessionKey } = keysMod as {
      ParentSessionKey: { name: string };
    };
    expect(ParentSessionKey.name).toBe("eve.parentSession");
    // Importing eve's container module published the storage on the global slot.
    expect(Reflect.get(globalThis, Symbol.for("eve.context-storage"))).toBe(contextStorage);

    const container = new ContextContainer();
    // The SessionParent shape as eve seeds it (runtime-context.js).
    container.set(ParentSessionKey, PARENT);

    const inScope = contextStorage.run(container, () => ambientSessionParent());
    expect(inScope).toEqual({
      callId: "call_01ABC",
      rootSessionId: "wrun_root",
      sessionId: "wrun_parent",
    });
  });

  test("outside the ALS scope (or for a root session) the read resolves null", async () => {
    const { containerMod } = await eveInternals();
    const { ContextContainer, contextStorage } = containerMod as {
      ContextContainer: new () => unknown;
      contextStorage: { run<T>(store: unknown, fn: () => T): T };
    };
    // Outside any run(): eve's real storage is on the slot, no store in scope.
    expect(ambientSessionParent()).toBeNull();
    // Inside a run() over a container with NO lineage entry (a root session).
    expect(contextStorage.run(new ContextContainer(), () => ambientSessionParent())).toBeNull();
  });
});
