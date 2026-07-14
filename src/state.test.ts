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
