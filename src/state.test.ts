import { describe, expect, test } from "bun:test";
import { defineExternalState } from "./state";

describe("defineExternalState", () => {
  test("returns the declaration, frozen", () => {
    const decl = defineExternalState({
      name: "notes",
      interface: "files",
      access: "rw",
      intent: "private",
    });
    expect(decl.name).toBe("notes");
    expect(decl.interface).toBe("files");
    expect(Object.isFrozen(decl)).toBe(true);
  });

  test("keeps suggested defaults when provided", () => {
    const decl = defineExternalState({
      name: "notes",
      interface: "files",
      access: "rw",
      intent: "private",
      suggestedDefaults: {
        engine: "zo-blob-r2",
        partition: "user",
        lifecycle: { archiveAfterDays: 30 },
      },
    });
    expect(decl.suggestedDefaults?.partition).toBe("user");
    expect(decl.suggestedDefaults?.lifecycle?.archiveAfterDays).toBe(30);
  });

  test("rejects an invalid name at runtime", () => {
    expect(() =>
      defineExternalState({
        name: "Bad Name!",
        interface: "files",
        access: "rw",
        intent: "private",
      }),
    ).toThrow(/name/);
  });

  test("rejects the out-of-scope kv interface at runtime", () => {
    expect(() =>
      defineExternalState({
        name: "notes",
        // @ts-expect-error deliberately invalid
        interface: "kv",
        access: "rw",
        intent: "private",
      }),
    ).toThrow(/interface/);
  });
});

// KTD3 (plans/erik/external-state-sandbox-completion-plan.md): the declaration
// module stays dependency-free and statically analyzable — importing and
// evaluating a declaration must never load ssh2, Eve context, or network code.
// The strongest pin is structural: the module has NO imports at all, so the
// composed runtime (agent-sandbox's state-client.ts) cannot creep in.
describe("declaration-module purity", () => {
  test("state.ts imports nothing — evaluating a declaration loads no transport code", async () => {
    const source = await Bun.file(new URL("./state.ts", import.meta.url)).text();
    expect(source).not.toMatch(/^\s*import[\s{]/m);
    expect(source).not.toMatch(/\bfrom\s+["']/);
    expect(source).not.toMatch(/\brequire\s*\(/);
  });
});
