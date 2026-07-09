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
import { readChatAttachment } from "./attachments";
import { createSandboxFileTools, createStdlib } from "./index";
import {
  __resetParkNotificationBridgeForTests,
  setParkNotificationHandler,
  type ParkNotification,
} from "./park-delivery";
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
// A minimal ISO BMFF header is all `read` inspects — no real footage needed.
writeFileSync(
  join(root, "clip.mp4"),
  Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(24)]),
);
writeFileSync(
  join(root, "song.mp3"),
  Buffer.concat([Buffer.from("ID3\x04\x00"), Buffer.alloc(16)]),
);

const stdlib = createStdlib({
  workspaceRoot: root,
  stateDir: join(root, ".agent"),
  workspaceNoun: "repo",
  bashInteractiveHint: "Use the fancy_terminal tool for interactive programs.",
});

// The stdlib's tools never touch the eve session context beyond `session.id`
// (which keys per-session state like conventions riders); a stub that throws
// on every capability keeps that honest without an `as`-cast.
function ctxWith(sessionId: string): ToolContext {
  return {
    session: {
      id: sessionId,
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
}
const ctx = ctxWith("test-session");

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

  test("ships the composed stack plus every à la carte instruction", () => {
    expect(Object.keys(stdlib.instructions).sort()).toEqual([
      "communication",
      "hitl",
      "parallelTools",
      "planning",
      "repoConventions",
      "stack",
      "subagents",
      "workflow",
    ]);
  });
});

describe("createSandboxFileTools instructions", () => {
  /** Resolve the stack's session.started markdown, parse-then-narrowed. */
  async function renderStack(
    sandbox: ReturnType<typeof createSandboxFileTools>,
  ): Promise<string> {
    const resolve = sandbox.instructions.stack.events["session.started"];
    if (!resolve) throw new Error("expected the stack to build on session.started");
    const resolved = await resolve(
      {},
      {
        session: { id: "sandbox-session", auth: { current: null, initiator: null } },
        channel: {},
        messages: [],
      },
    );
    if (typeof resolved !== "object" || resolved === null || !("markdown" in resolved)) {
      throw new Error("expected the resolver to return instructions");
    }
    const { markdown } = resolved;
    if (typeof markdown !== "string") throw new Error("expected markdown to be a string");
    return markdown;
  }

  test("the sandbox stack drops repo-conventions and parallel-tools, keeps the rest", async () => {
    const sandbox = createSandboxFileTools({
      workspaceRoot: "/workspace",
      mediaOracle: true,
    });
    const markdown = await renderStack(sandbox);
    // The workspace isn't on this process's disk and this toolset ships no
    // bash/tasks machinery — those two sections must never render.
    expect(markdown).not.toContain("## Repository conventions");
    expect(markdown).not.toContain("## Parallel tool calls");
    for (const heading of [
      "## How to work",
      "## Planning your work (todo)",
      "## Delegating with the agent tool",
      "## Media you can't view (look)",
      "## Asking the user (ask_question)",
      "## Communicating",
    ]) {
      expect(markdown).toContain(heading);
    }
  });

  test("no oracle → no media section in the sandbox stack", async () => {
    const sandbox = createSandboxFileTools({ workspaceRoot: "/workspace" });
    const markdown = await renderStack(sandbox);
    expect(markdown).not.toContain("## Media you can't view (look)");
  });

  test("honors omitInstructionSections, extraInstructionSections, and the tier", async () => {
    const sandbox = createSandboxFileTools({
      workspaceRoot: "/workspace",
      instructionTier: "compact",
      omitInstructionSections: ["subagents"],
      extraInstructionSections: [
        {
          section: { id: "persona", heading: "Who you are", body: "The builder." },
          placement: { after: "workflow" },
        },
      ],
    });
    const markdown = await renderStack(sandbox);
    expect(markdown).not.toContain("## Delegating with the agent tool");
    expect(markdown.indexOf("## Who you are")).toBeGreaterThan(
      markdown.indexOf("## How to work"),
    );
    // Compact tier renders shorter than the default full tier.
    const full = await renderStack(createSandboxFileTools({ workspaceRoot: "/workspace" }));
    expect(markdown.length).toBeLessThan(full.length);
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

  test("inlines a small image as a model-hidden chat attachment", async () => {
    const result = await stdlib.tools.read.execute({ path: "pic.png" }, ctx);
    expect(result).toMatchObject({ path: "pic.png", source: "image", format: "png" });

    // Bytes ride the raw result under the attachment field...
    const attachment = readChatAttachment(result);
    if (!attachment) throw new Error("expected a chat attachment on the result");
    expect(attachment.mediaType).toBe("image/png");
    expect(attachment.filename).toBe("pic.png");
    expect(attachment.dataUrl.startsWith("data:image/png;base64,")).toBe(true);

    // ...but toModelOutput strips them, so the model only sees metadata + note.
    const model = await stdlib.tools.read.toModelOutput?.(result);
    if (!model || model.type !== "json") throw new Error("expected json model output");
    expect(readChatAttachment(model.value)).toBeNull();
    const value = model.value as Record<string, unknown>;
    expect(value.source).toBe("image");
    expect(typeof value.note).toBe("string");
    expect(value.note as string).toContain("next message");
  });

  test("falls back to a metadata-only note when inlining is disabled", async () => {
    const plain = createStdlib({
      workspaceRoot: root,
      stateDir: join(root, ".agent-noinline"),
      attachImagesToChat: false,
    });
    const result = await plain.tools.read.execute({ path: "pic.png" }, ctx);
    expect(result).toMatchObject({ path: "pic.png", source: "image" });
    expect(readChatAttachment(result)).toBeNull();
    if (!("note" in result) || typeof result.note !== "string") throw new Error("expected a note");
    expect(result.note).toContain("ask the user");
  });

  test("falls back when the image exceeds the inline size cap", async () => {
    const capped = createStdlib({
      workspaceRoot: root,
      stateDir: join(root, ".agent-capped"),
      maxInlineImageBytes: 1,
    });
    const result = await capped.tools.read.execute({ path: "pic.png" }, ctx);
    expect(readChatAttachment(result)).toBeNull();
    if (!("note" in result) || typeof result.note !== "string") throw new Error("expected a note");
    expect(result.note).toContain("too large");
  });

  test("video/audio reads return metadata only by default", async () => {
    const video = await stdlib.tools.read.execute({ path: "clip.mp4" }, ctx);
    expect(video).toMatchObject({
      path: "clip.mp4",
      source: "video",
      format: "mp4",
      mediaType: "video/mp4",
    });
    expect(readChatAttachment(video)).toBeNull();
    if (!("note" in video) || typeof video.note !== "string") throw new Error("expected a note");
    expect(video.note).toContain("not enabled");

    const audio = await stdlib.tools.read.execute({ path: "song.mp3" }, ctx);
    expect(audio).toMatchObject({ source: "audio", format: "mp3", mediaType: "audio/mpeg" });
    expect(readChatAttachment(audio)).toBeNull();
  });

  test("attachVideoToChat/attachAudioToChat opt into media attachments", async () => {
    const multimodal = createStdlib({
      workspaceRoot: root,
      stateDir: join(root, ".agent-media"),
      attachVideoToChat: true,
      attachAudioToChat: true,
    });
    expect(multimodal.tools.read.description).toContain("image or video or audio files");

    const video = await multimodal.tools.read.execute({ path: "clip.mp4" }, ctx);
    const attachment = readChatAttachment(video);
    if (!attachment) throw new Error("expected a chat attachment on the result");
    expect(attachment.kind).toBe("video");
    expect(attachment.mediaType).toBe("video/mp4");
    expect(attachment.filename).toBe("clip.mp4");
    expect(attachment.dataUrl.startsWith("data:video/mp4;base64,")).toBe(true);

    // toModelOutput strips the bytes for media too.
    const model = await multimodal.tools.read.toModelOutput?.(video);
    if (!model || model.type !== "json") throw new Error("expected json model output");
    expect(readChatAttachment(model.value)).toBeNull();

    const audio = await multimodal.tools.read.execute({ path: "song.mp3" }, ctx);
    expect(readChatAttachment(audio)?.kind).toBe("audio");
  });

  test("media over the inline cap falls back to the metadata note", async () => {
    const capped = createStdlib({
      workspaceRoot: root,
      stateDir: join(root, ".agent-media-capped"),
      attachVideoToChat: true,
      maxInlineMediaBytes: 1,
    });
    const result = await capped.tools.read.execute({ path: "clip.mp4" }, ctx);
    expect(readChatAttachment(result)).toBeNull();
    if (!("note" in result) || typeof result.note !== "string") throw new Error("expected a note");
    expect(result.note).toContain("too large");
  });

  test("refuses paths that escape the workspace", async () => {
    expect(stdlib.tools.read.execute({ path: "../outside.txt" }, ctx)).rejects.toThrow(/escapes/);
  });
});

describe("directory conventions riders", () => {
  // Fixture: a dir with its own conventions file plus a readable file in it.
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs/AGENTS.md"), "# docs conventions\nBe brief.\n");
  writeFileSync(join(root, "docs/guide.md"), "welcome\n");

  function ridersOf(result: unknown): unknown {
    if (typeof result === "object" && result !== null && "directory_conventions" in result) {
      return (result as Record<string, unknown>).directory_conventions;
    }
    return undefined;
  }

  test("the read description advertises the rider contract", () => {
    expect(stdlib.tools.read.description).toContain("directory_conventions");
  });

  test("first read under a dir delivers its conventions; later reads don't; sessions are independent", async () => {
    const a = ctxWith("riders-a");
    const first = await stdlib.tools.read.execute({ path: "docs/guide.md" }, a);
    expect(ridersOf(first)).toEqual([
      { path: join("docs", "AGENTS.md"), content: "# docs conventions\nBe brief." },
    ]);

    const second = await stdlib.tools.read.execute({ path: "docs/guide.md" }, a);
    expect(ridersOf(second)).toBeUndefined();

    const b = await stdlib.tools.read.execute({ path: "docs/guide.md" }, ctxWith("riders-b"));
    expect(ridersOf(b)).toBeDefined();
  });

  test("a failing read doesn't consume the once-per-session delivery slot", async () => {
    mkdirSync(join(root, "docs-fail"), { recursive: true });
    writeFileSync(join(root, "docs-fail/AGENTS.md"), "# fail-dir conventions\n");
    // An opaque binary: content loading throws, so no result is returned —
    // the directory's conventions must still deliver on the next good read.
    writeFileSync(join(root, "docs-fail/blob.bin"), Buffer.from([0x00, 0x01, 0x02, 0xff]));
    writeFileSync(join(root, "docs-fail/notes.txt"), "hello\n");

    const failing = ctxWith("riders-failing");
    expect(stdlib.tools.read.execute({ path: "docs-fail/blob.bin" }, failing)).rejects.toThrow();
    const ok = await stdlib.tools.read.execute({ path: "docs-fail/notes.txt" }, failing);
    expect(ridersOf(ok)).toEqual([
      { path: "docs-fail/AGENTS.md", content: "# fail-dir conventions" },
    ]);
  });

  test("injectDirConventions: false disables riders and the description hint", async () => {
    const plain = createStdlib({
      workspaceRoot: root,
      stateDir: join(root, ".agent-noriders"),
      injectDirConventions: false,
    });
    expect(plain.tools.read.description).not.toContain("directory_conventions");
    const result = await plain.tools.read.execute({ path: "docs/guide.md" }, ctxWith("riders-c"));
    expect(ridersOf(result)).toBeUndefined();
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
    expect(result).toEqual({ ok: true, path: "edit-me.txt", replacements: 1, matched: "simple" });
    expect(readFileSync(join(root, "edit-me.txt"), "utf8")).toBe("1 two two\n");
  });

  test("edit refuses a non-unique match without replace_all", async () => {
    expect(
      stdlib.tools.edit.execute(
        { path: "edit-me.txt", old_string: "two", new_string: "2" },
        ctx,
      ),
    ).rejects.toThrow(/not unique/);
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

describe("notify watchers", () => {
  const built = buildTasksToolset({
    registry: stdlib.registry,
    backgroundables: stdlib.backgroundables,
  });
  if (!built) throw new Error("expected the tasks toolset to build");

  /** Capture posts for one test; always reset the process-global bridge. */
  async function withCapturedPosts(
    run: (posts: { sessionId: string; notification: ParkNotification }[]) => Promise<void>,
  ): Promise<void> {
    const posts: { sessionId: string; notification: ParkNotification }[] = [];
    setParkNotificationHandler((sessionId, notification) =>
      posts.push({ sessionId, notification }),
    );
    try {
      await run(posts);
    } finally {
      __resetParkNotificationBridgeForTests();
    }
  }

  test("a backgrounded bash command posts a notification when output matches", async () => {
    await withCapturedPosts(async (posts) => {
      const started = await stdlib.tools.bash.execute(
        {
          command: "sleep 0.15; echo 'ERROR: kaboom'",
          foreground_ms: 20,
          notify: { pattern: "ERROR", reason: "failure lines" },
        },
        ctx,
      );
      expect(started).toMatchObject({ mode: "backgrounded", watching: "ERROR" });
      if (started.mode !== "backgrounded") throw new Error("expected a task handle");

      await built.await_task.execute({ task_id: started.task_id, wait_ms: 5_000 }, ctx);
      // The flush rides the command's own result promise; yield once for it.
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(posts).toHaveLength(1);
      const post = posts[0];
      if (!post) throw new Error("expected a captured post");
      expect(post.sessionId).toBe("test-session");
      expect(post.notification.key).toBe(`${started.task_id}#watch1`);
      expect(post.notification.text).toContain("failure lines");
      expect(post.notification.text).toContain("ERROR: kaboom");
    });
  });

  test("a foreground bash completion posts nothing", async () => {
    await withCapturedPosts(async (posts) => {
      const result = await stdlib.tools.bash.execute(
        { command: "echo 'ERROR: seen in foreground'", notify: { pattern: "ERROR", reason: "errors" } },
        ctx,
      );
      expect(result).toMatchObject({ mode: "completed" });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(posts).toHaveLength(0);
    });
  });

  test("run_async notify + notify_on_complete post match and settle notices", async () => {
    await withCapturedPosts(async (posts) => {
      const started = await built.run_async.execute(
        {
          tool: "bash",
          input: { command: "echo 'WARN: hot path'" },
          notify: { pattern: "WARN", reason: "warnings" },
          notify_on_complete: true,
        },
        ctx,
      );
      expect(started).toMatchObject({ status: "running", watching: "WARN" });
      await built.await_task.execute({ task_id: started.task_id, wait_ms: 5_000 }, ctx);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const keys = posts.map((p) => p.notification.key).sort();
      expect(keys).toEqual([`${started.task_id}#done`, `${started.task_id}#watch1`]);
      const done = posts.find((p) => p.notification.key.endsWith("#done"));
      expect(done?.notification.text).toContain("finished");
      expect(done?.notification.text).toContain("await_task");
    });
  });

  test("an invalid notify regex fails as a normal tool error before any work starts", () => {
    expect(
      stdlib.tools.bash.execute(
        { command: "echo hi", notify: { pattern: "(", reason: "broken" } },
        ctx,
      ),
    ).rejects.toThrow();
  });
});
