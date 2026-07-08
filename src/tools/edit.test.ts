import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "eve/tools";
import { createWorkspace } from "../workspace";
import { localIoProvider, type WorkspaceIoProvider } from "../workspace-io";
import { createEditTool } from "./edit";
import { createWriteTool } from "./write";

const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-edit-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const workspace = createWorkspace(root);
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A local IO whose reads yield to the event loop before returning, so two
// concurrent executes reliably interleave read-modify-write without the lock —
// the exact shape of the live clobber this suite pins the fix for.
const slowReadIo: WorkspaceIoProvider = (ctx) => {
  const io = localIoProvider(workspace.root)(ctx);
  return {
    ...io,
    readFile: async (path) => {
      await delay(10);
      return io.readFile(path);
    },
  };
};

// The stdlib file tools never touch eve session capabilities; a throwing stub
// keeps that honest (mirrors index.test.ts).
const ctx: ToolContext = {
  session: {
    id: "edit-test-session",
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

describe("createEditTool concurrency", () => {
  test("two concurrent edits to the same file both land", async () => {
    // Regression: eve runs a step's tool calls via Promise.all, and a model
    // batching two edits to one file (an import line + a body change) raced
    // them — both read the original, the second write dropped the first edit,
    // and both reported success. The per-path lock serializes them.
    const file = join(root, "widget.ts");
    writeFileSync(file, "import { a } from './a';\n\nexport const color = 'red';\n");
    const edit = createEditTool({ workspace, noun: "workspace", io: slowReadIo });

    const [first, second] = await Promise.all([
      edit.execute(
        {
          path: "widget.ts",
          old_string: "export const color = 'red';",
          new_string: "export const color = 'blue';",
        },
        ctx,
      ),
      edit.execute(
        {
          path: "widget.ts",
          old_string: "import { a } from './a';",
          new_string: "import { assertNever } from './never';\nimport { a } from './a';",
        },
        ctx,
      ),
    ]);

    expect(first).toMatchObject({ ok: true, replacements: 1 });
    expect(second).toMatchObject({ ok: true, replacements: 1 });
    const final = readFileSync(file, "utf8");
    expect(final).toContain("export const color = 'blue';");
    expect(final).toContain("import { assertNever } from './never';");
  });

  test("concurrent edits to different files stay independent", async () => {
    writeFileSync(join(root, "one.txt"), "alpha\n");
    writeFileSync(join(root, "two.txt"), "beta\n");
    const edit = createEditTool({ workspace, noun: "workspace", io: slowReadIo });
    await Promise.all([
      edit.execute({ path: "one.txt", old_string: "alpha", new_string: "ALPHA" }, ctx),
      edit.execute({ path: "two.txt", old_string: "beta", new_string: "BETA" }, ctx),
    ]);
    expect(readFileSync(join(root, "one.txt"), "utf8")).toBe("ALPHA\n");
    expect(readFileSync(join(root, "two.txt"), "utf8")).toBe("BETA\n");
  });

  test("a not-found edit points at the closest region ('did you mean')", async () => {
    // Stale body line: the anchor line exists but the second line doesn't,
    // so every replacer misses — the error should carry a numbered preview
    // of the region instead of just "re-read the file".
    writeFileSync(
      join(root, "hint.ts"),
      "export function greet(name: string) {\n  const message = `hi ${name}`;\n  return message;\n}\n",
    );
    const edit = createEditTool({ workspace, noun: "workspace" });
    expect(
      edit.execute(
        {
          path: "hint.ts",
          old_string: "export function greet(name: string) {\n  const msg = name;\n}",
          new_string: "x",
        },
        ctx,
      ),
    ).rejects.toThrow(/Closest match, around line 1:[\s\S]*1\|export function greet/);
  });

  test("an edit racing a write to the same file does not interleave", async () => {
    // The write must not land between the edit's read and its write — either
    // order is coherent (edit-then-write leaves the written content; write-
    // then-edit fails or applies to the new content), but a lost update isn't.
    const file = join(root, "raced.txt");
    writeFileSync(file, "original\n");
    const edit = createEditTool({ workspace, noun: "workspace", io: slowReadIo });
    const write = createWriteTool({ workspace, noun: "workspace", io: slowReadIo });

    const [editResult, writeResult] = await Promise.allSettled([
      edit.execute({ path: "raced.txt", old_string: "original", new_string: "edited" }, ctx),
      write.execute({ path: "raced.txt", content: "overwritten\n" }, ctx),
    ]);
    // FIFO: the edit (queued first) applies to the original, then the write
    // overwrites — both succeed, and the final content is the write's.
    expect(editResult?.status).toBe("fulfilled");
    expect(writeResult?.status).toBe("fulfilled");
    expect(readFileSync(file, "utf8")).toBe("overwritten\n");
  });
});
