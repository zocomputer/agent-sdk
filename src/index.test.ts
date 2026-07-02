import { afterAll, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "eve/tools";
import { createStdlib } from "./index";
import { buildTasksToolset } from "./tools/tasks";

// One temp workspace shared by the suite: not a git repo, so glob/grep also
// exercise the walkFiles fallback. realpath because macOS's tmpdir is a
// /private symlink and workspace paths must be canonical.
const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-tools-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));

mkdirSync(join(root, "src"), { recursive: true });
writeFileSync(join(root, "hello.txt"), "alpha\nbeta\ngamma\n");
writeFileSync(join(root, "src/app.ts"), "export const answer = 42; // the answer\n");
const fixture = (name: string) => new URL(`extract/fixtures/${name}`, import.meta.url).pathname;
copyFileSync(fixture("two-page.pdf"), join(root, "doc.pdf"));
copyFileSync(fixture("tiny.png"), join(root, "pic.png"));

const stdlib = createStdlib({
  workspaceRoot: root,
  stateDir: join(root, ".agent"),
  workspaceNoun: "repo",
  bashInteractiveHint: "Use the fancy_terminal tool for interactive programs.",
});

// The stdlib's tools never touch the eve session context; a stub that throws
// on every capability keeps that honest without an `as`-cast.
const ctx: ToolContext = {
  session: {
    id: "test-session",
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

describe("createStdlib", () => {
  test("interpolates the workspace noun and hints into descriptions", () => {
    expect(stdlib.tools.read.description).toContain("Read a file from the repo");
    expect(stdlib.tools.glob.description).toContain("repo-relative paths");
    expect(stdlib.tools.bash.description).toContain("fancy_terminal");
    expect(stdlib.tools.bash.description).not.toContain("piped shell with NO tty");
  });

  test("exposes the workspace, spill dir, and bash backgroundable", () => {
    expect(stdlib.workspace.root).toBe(root);
    expect(stdlib.spillDir).toBe(join(root, ".agent", "tool-outputs"));
    expect(stdlib.backgroundables.map((o) => o.name)).toEqual(["bash"]);
  });
});

describe("read tool", () => {
  test("returns a line-numbered window for text", async () => {
    const result = await stdlib.tools.read.execute({ path: "hello.txt" }, ctx);
    expect(result).toMatchObject({ path: "hello.txt", startLine: 1 });
    if (!("content" in result)) throw new Error("expected a text view");
    expect(result.content).toContain("|alpha");
    expect(result.content).toContain("|gamma");
  });

  test("converts a PDF and reports the page count", async () => {
    const result = await stdlib.tools.read.execute({ path: "doc.pdf" }, ctx);
    expect(result).toMatchObject({ path: "doc.pdf", source: "pdf", pages: 2 });
    if (!("content" in result)) throw new Error("expected a text view");
    expect(result.content).toContain("=== page 1 of 2 ===");
  });

  test("returns metadata (not text) for an image", async () => {
    const result = await stdlib.tools.read.execute({ path: "pic.png" }, ctx);
    expect(result).toMatchObject({ path: "pic.png", source: "image", format: "png" });
    if (!("note" in result) || typeof result.note !== "string") throw new Error("expected a note");
    expect(result.note).toContain("attach");
  });

  test("refuses paths that escape the workspace", async () => {
    expect(stdlib.tools.read.execute({ path: "../outside.txt" }, ctx)).rejects.toThrow(/escapes/);
  });
});

describe("edit and write tools", () => {
  test("write creates parent directories and reports bytes", async () => {
    const result = await stdlib.tools.write.execute(
      { path: "notes/todo.md", content: "- ship it\n" },
      ctx,
    );
    expect(result).toEqual({ ok: true, path: "notes/todo.md", created: true, bytes: 10 });
    expect(readFileSync(join(root, "notes/todo.md"), "utf8")).toBe("- ship it\n");
  });

  test("edit replaces a unique string", async () => {
    writeFileSync(join(root, "edit-me.txt"), "one two two\n");
    const result = await stdlib.tools.edit.execute(
      { path: "edit-me.txt", old_string: "one", new_string: "1" },
      ctx,
    );
    expect(result).toEqual({ ok: true, path: "edit-me.txt", replacements: 1 });
    expect(readFileSync(join(root, "edit-me.txt"), "utf8")).toBe("1 two two\n");
  });

  test("edit refuses a non-unique match without replace_all", async () => {
    expect(
      stdlib.tools.edit.execute(
        { path: "edit-me.txt", old_string: "two", new_string: "2" },
        ctx,
      ),
    ).rejects.toThrow(/not unique .*2 matches/);
    const all = await stdlib.tools.edit.execute(
      { path: "edit-me.txt", old_string: "two", new_string: "2", replace_all: true },
      ctx,
    );
    expect(all).toMatchObject({ replacements: 2 });
  });
});

describe("glob and grep tools", () => {
  test("glob matches at any depth without a leading **/", async () => {
    const result = await stdlib.tools.glob.execute({ pattern: "*.ts" }, ctx);
    expect(result.files).toContain("src/app.ts");
  });

  test("grep finds matching lines with file and line number", async () => {
    const result = await stdlib.tools.grep.execute({ pattern: "answer = \\d+" }, ctx);
    expect(result.matches).toEqual([
      { file: "src/app.ts", line: 1, text: "export const answer = 42; // the answer" },
    ]);
  });

  test("grep scopes to a directory and filters by glob", async () => {
    const scoped = await stdlib.tools.grep.execute({ pattern: "answer", path: "src" }, ctx);
    expect(scoped.count).toBe(1);
    const filtered = await stdlib.tools.grep.execute({ pattern: "alpha", glob: "**/*.ts" }, ctx);
    expect(filtered.count).toBe(0);
  });
});

describe("bash tool and background tasks", () => {
  const built = buildTasksToolset({
    registry: stdlib.registry,
    backgroundables: stdlib.backgroundables,
  });
  if (!built) throw new Error("expected the tasks toolset to build");

  test("a quick command completes in the foreground", async () => {
    const result = await stdlib.tools.bash.execute({ command: "echo hi" }, ctx);
    expect(result).toMatchObject({ workdir: root, mode: "completed", exitCode: 0, stdout: "hi\n" });
  });

  test("a slow command returns a task handle collectable via await_task", async () => {
    const started = await stdlib.tools.bash.execute(
      { command: "sleep 0.3 && echo done", foreground_ms: 20 },
      ctx,
    );
    expect(started).toMatchObject({ mode: "backgrounded", status: "running" });
    if (started.mode !== "backgrounded") throw new Error("expected a task handle");

    const awaited = await built.await_task.execute(
      { task_id: started.task_id, wait_ms: 5_000 },
      ctx,
    );
    expect(awaited).toMatchObject({
      task_id: started.task_id,
      tool: "bash",
      status: "done",
      result: { stdout: "done\n", exitCode: 0 },
    });
  });

  test("run_async launches bash and check_tasks reports it", async () => {
    const started = await built.run_async.execute(
      { tool: "bash", input: { command: "echo bg" } },
      ctx,
    );
    expect(started).toMatchObject({ tool: "bash", status: "running" });
    const listed = await built.check_tasks.execute({}, ctx);
    expect(listed.tasks.map((t) => t.task_id)).toContain(started.task_id);
    const awaited = await built.await_task.execute(
      { task_id: started.task_id, wait_ms: 5_000 },
      ctx,
    );
    expect(awaited).toMatchObject({ status: "done", result: { stdout: "bg\n" } });
  });

  test("run_async rejects input that fails the op's schema", () => {
    expect(() => built.run_async.execute({ tool: "bash", input: { command: "" } }, ctx)).toThrow(
      /Invalid input for "bash"/,
    );
  });
});
