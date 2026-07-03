import { describe, expect, test } from "bun:test";
import {
  decodeText,
  encodeText,
  readSandboxId,
  resolveSandboxPath,
  shellSingleQuote,
} from "./pure";

describe("resolveSandboxPath", () => {
  test("anchors a relative path under the work dir", () => {
    expect(resolveSandboxPath("/home/daytona", "src/run.py")).toBe(
      "/home/daytona/src/run.py",
    );
  });

  test("passes an absolute path through unchanged", () => {
    expect(resolveSandboxPath("/home/daytona", "/etc/hosts")).toBe("/etc/hosts");
  });

  test("normalizes . and .. segments in a relative path", () => {
    expect(resolveSandboxPath("/home/daytona", "./a/../b")).toBe("/home/daytona/b");
  });

  test("honors a non-default work dir", () => {
    expect(resolveSandboxPath("/workspace", "notes.txt")).toBe("/workspace/notes.txt");
  });

  test("rejects a relative path that escapes the work dir via ..", () => {
    expect(() => resolveSandboxPath("/home/daytona", "../../etc/passwd")).toThrow(
      /escapes the work dir/,
    );
  });

  test("rejects a sneaky escape that normalizes outside", () => {
    expect(() => resolveSandboxPath("/home/daytona", "a/../../x")).toThrow(
      /escapes the work dir/,
    );
  });

  test("allows .. that stays within the work dir", () => {
    expect(resolveSandboxPath("/home/daytona", "a/../b")).toBe("/home/daytona/b");
  });

  test("does not guard absolute paths (explicit pass-through)", () => {
    expect(resolveSandboxPath("/home/daytona", "/etc/passwd")).toBe("/etc/passwd");
  });
});

describe("readSandboxId", () => {
  test("returns the id when metadata carries a string daytonaSandboxId", () => {
    expect(readSandboxId({ daytonaSandboxId: "sbx_123" })).toBe("sbx_123");
  });

  test("returns null for undefined metadata", () => {
    expect(readSandboxId(undefined)).toBeNull();
  });

  test("returns null when the field is missing", () => {
    expect(readSandboxId({ other: "x" })).toBeNull();
  });

  test("returns null when the field isn't a string", () => {
    expect(readSandboxId({ daytonaSandboxId: 42 })).toBeNull();
  });

  test("returns null for an empty string (nothing was provisioned)", () => {
    expect(readSandboxId({ daytonaSandboxId: "" })).toBeNull();
  });
});

describe("shellSingleQuote", () => {
  test("wraps a plain path in single quotes", () => {
    expect(shellSingleQuote("/home/daytona/work")).toBe("'/home/daytona/work'");
  });

  test("neutralizes shell metacharacters", () => {
    expect(shellSingleQuote("/tmp/$(rm -rf x)")).toBe("'/tmp/$(rm -rf x)'");
    expect(shellSingleQuote("a; rm -rf /")).toBe("'a; rm -rf /'");
  });

  test("escapes embedded single quotes", () => {
    expect(shellSingleQuote("it's")).toBe("'it'\\''s'");
  });
});

// (Line-range slicing is no longer ours — readTextFile uses the AI-SDK's
// extractLines. Nothing to unit-test here.)

describe("decodeText / encodeText", () => {
  test("utf-8 round-trips by default, incl. multibyte", () => {
    const s = "héllo · 世界 🚀";
    expect(decodeText(encodeText(s))).toBe(s);
  });

  test("default and explicit utf-8/utf8 are equivalent", () => {
    expect([...encodeText("ä")]).toEqual([...encodeText("ä", "utf-8")]);
    expect([...encodeText("ä", "utf8")]).toEqual([...encodeText("ä", "utf-8")]);
  });

  test("utf-8 decode is fatal: invalid bytes throw, not replaced", () => {
    // 0xFF is not valid UTF-8; fatal mode rejects rather than emitting U+FFFD.
    expect(() => decodeText(new Uint8Array([0xff]))).toThrow();
  });

  test("a non-utf8 encoding round-trips (e.g. base64)", () => {
    const bytes = encodeText("aGk=", "base64"); // "hi"
    expect(new TextDecoder().decode(bytes)).toBe("hi");
    expect(decodeText(new Uint8Array([0x68, 0x69]), "base64")).toBe("aGk=");
  });

  test("an unsupported encoding throws a clear error, not an opaque cast failure", () => {
    expect(() => decodeText(new Uint8Array([1]), "not-a-real-encoding")).toThrow(
      /unsupported text encoding/,
    );
    expect(() => encodeText("x", "rot13")).toThrow(/unsupported text encoding/);
  });
});
