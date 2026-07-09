import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "eve/tools";
import { createWorkspace } from "../workspace";
import { createWriteTool } from "./write";

const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-write-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const workspace = createWorkspace(root);

// The stdlib file tools never touch eve session capabilities; a throwing stub
// keeps that honest (mirrors edit.test.ts).
const ctx: ToolContext = {
  session: {
    id: "write-test-session",
    auth: { current: null, initiator: null },
    turn: { id: "turn-1", sequence: 1 },
  },
  getSandbox: () => Promise.reject(new Error("no sandbox in tests")),
  getSkill: () => {
    throw new Error("no skills in tests");
  },
  getToken: () => Promise.reject(new Error("no auth in tests")),
  requireAuth: () => {
    throw new Error("no auth in tests");
  },
};

const write = createWriteTool({ workspace, noun: "workspace" });

describe("createWriteTool", () => {
  test("creates a new file, reporting created: true", async () => {
    const result = await write.execute({ path: "fresh/new.txt", content: "hello\n" }, ctx);
    expect(result).toMatchObject({ ok: true, path: "fresh/new.txt", created: true });
    expect(readFileSync(join(root, "fresh/new.txt"), "utf8")).toBe("hello\n");
  });

  test("overwrites an existing file, reporting created: false", async () => {
    writeFileSync(join(root, "existing.txt"), "old\n");
    const result = await write.execute({ path: "existing.txt", content: "new\n" }, ctx);
    expect(result).toMatchObject({ ok: true, created: false });
    expect(readFileSync(join(root, "existing.txt"), "utf8")).toBe("new\n");
  });

  test("rejects a directory path with guidance, not a raw fs error", async () => {
    // Without the guard, readFile on the directory throws EISDIR — a raw
    // node error with no corrective action. The rejection must name the
    // problem, state nothing was written, and say what to do instead.
    mkdirSync(join(root, "some-dir"));
    writeFileSync(join(root, "some-dir/kept.txt"), "kept\n");
    expect(write.execute({ path: "some-dir", content: "clobber" }, ctx)).rejects.toThrow(
      /some-dir is a directory — nothing was written\. Give a file path/,
    );
    // State unchanged: the directory and its contents are intact.
    expect(readFileSync(join(root, "some-dir/kept.txt"), "utf8")).toBe("kept\n");
    expect(existsSync(join(root, "some-dir"))).toBe(true);
  });
});
