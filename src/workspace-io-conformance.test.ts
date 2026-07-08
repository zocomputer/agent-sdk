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
import type { SandboxSession } from "eve/sandbox";
import type { ToolContext } from "eve/tools";
import { readChatAttachment } from "./attachments";
import { createDirConventionsTracker } from "./dir-conventions";
import { sandboxIoProvider } from "./sandbox-io";
import { createEditTool } from "./tools/edit";
import { createGlobTool } from "./tools/glob";
import { createGrepTool } from "./tools/grep";
import { createLookTool, DEFAULT_MEDIA_ORACLE, type LookGenerateFn } from "./tools/look";
import { createReadTool } from "./tools/read";
import { createWriteTool } from "./tools/write";
import { createWorkspace } from "./workspace";
import { localIoProvider, type WorkspaceIoProvider } from "./workspace-io";
import { createFakeSandboxSession } from "./workspace-io.test-helpers";

// The conformance suite: one shared spec over every WorkspaceIO backend, so
// the local (node:fs) and sandbox (SandboxSession) implementations can't
// drift. Each backend gets its own temp workspace with identical fixtures;
// the sandbox backend runs through the fake session — real /bin/sh, real
// git/rg/grep/stat — so the remote command paths are genuinely exercised.

interface Backend {
  readonly name: string;
  readonly root: string;
  readonly io: WorkspaceIoProvider;
  readonly ctx: (sessionId: string) => ToolContext;
}

function seedFixtures(root: string): void {
  const fixture = (name: string) =>
    new URL(`extract/fixtures/${name}`, import.meta.url).pathname;
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "hello.txt"), "alpha\nbeta\ngamma\n");
  writeFileSync(join(root, "src/app.ts"), "export const answer = 42; // the answer\n");
  copyFileSync(fixture("two-page.pdf"), join(root, "doc.pdf"));
  copyFileSync(fixture("two-slide.pptx"), join(root, "deck.pptx"));
  copyFileSync(fixture("three-cell.ipynb"), join(root, "analysis.ipynb"));
  copyFileSync(fixture("tiny.png"), join(root, "pic.png"));
  // A minimal ISO BMFF header is all `read` inspects — no real footage needed.
  writeFileSync(
    join(root, "clip.mp4"),
    Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(24)]),
  );
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs/AGENTS.md"), "# docs conventions\nBe brief.\n");
  writeFileSync(join(root, "docs/guide.md"), "welcome\n");
  // Overflow corpus for the grep spill spec.
  writeFileSync(
    join(root, "many.txt"),
    Array.from({ length: 60 }, (_, i) => `needle line ${i}`).join("\n") + "\n",
  );
}

function stubContext(sessionId: string, getSandbox: ToolContext["getSandbox"]): ToolContext {
  return {
    session: {
      id: sessionId,
      auth: { current: null, initiator: null },
      turn: { id: "turn-1", sequence: 1 },
    },
    getSandbox,
    getSkill: () => {
      throw new Error("no skills in tests");
    },
    getToken: () => Promise.reject(new Error("no auth in tests")),
    requireAuth: () => {
      throw new Error("no auth in tests");
    },
  };
}

function makeBackends(): Backend[] {
  const localRoot = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-conf-local-")));
  seedFixtures(localRoot);
  const local: Backend = {
    name: "local",
    root: localRoot,
    io: localIoProvider(localRoot),
    // The local backend must never touch the session sandbox.
    ctx: (sessionId) =>
      stubContext(sessionId, () => Promise.reject(new Error("no sandbox for local IO"))),
  };

  const sandboxRoot = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-conf-sb-")));
  seedFixtures(sandboxRoot);
  // The IO only uses the SandboxSessionLike slice; pad the rest of eve's
  // SandboxSession surface with inert stubs so the stub ToolContext needs no
  // cast — anything outside the slice failing loudly keeps the seam honest.
  const fake = createFakeSandboxSession(sandboxRoot);
  const session: SandboxSession = {
    id: "fake-sandbox",
    readBinaryFile: fake.readBinaryFile,
    writeBinaryFile: fake.writeBinaryFile,
    run: fake.run,
    readFile: () => Promise.reject(new Error("outside the SandboxSessionLike slice")),
    readTextFile: () => Promise.reject(new Error("outside the SandboxSessionLike slice")),
    writeFile: () => Promise.reject(new Error("outside the SandboxSessionLike slice")),
    writeTextFile: () => Promise.reject(new Error("outside the SandboxSessionLike slice")),
    spawn: () => Promise.reject(new Error("outside the SandboxSessionLike slice")),
    resolvePath: (path) => path,
    setNetworkPolicy: () => Promise.reject(new Error("outside the SandboxSessionLike slice")),
    removePath: () => Promise.reject(new Error("outside the SandboxSessionLike slice")),
  };
  const sandbox: Backend = {
    name: "sandbox",
    root: sandboxRoot,
    io: sandboxIoProvider({ root: sandboxRoot }),
    // The sandbox backend resolves its session from the tool context, like a
    // hosted agent's `ctx.getSandbox()`.
    ctx: (sessionId) => stubContext(sessionId, () => Promise.resolve(session)),
  };
  return [local, sandbox];
}

const backends = makeBackends();
afterAll(() => {
  for (const backend of backends) rmSync(backend.root, { recursive: true, force: true });
});

for (const backend of backends) {
  describe(`file tools over ${backend.name} IO`, () => {
    const workspace = createWorkspace(backend.root);
    const { io } = backend;
    const noun = "repo";
    const spillDir = join(backend.root, ".agent", "tool-outputs");
    const dirConventions = {
      tracker: createDirConventionsTracker({
        workspaceRoot: backend.root,
        fileName: "AGENTS.md",
        // Force every rider load through the per-call IO override the read
        // tool passes: a tracker-level loader would mask a broken backend.
        loadFile: () => {
          throw new Error("rider loads must go through the read tool's IO");
        },
      }),
      fileName: "AGENTS.md",
    };
    const read = createReadTool({
      workspace,
      noun,
      io,
      attachImagesToChat: true,
      maxInlineImageBytes: 3 * 1024 * 1024,
      dirConventions,
    });
    const edit = createEditTool({ workspace, noun, io });
    const write = createWriteTool({ workspace, noun, io });
    const glob = createGlobTool({ workspace, noun, io });
    const grep = createGrepTool({ workspace, noun, io, spillDir });
    const ctx = backend.ctx(`conf-${backend.name}`);

    test("read returns a line-numbered window for text", async () => {
      const result = await read.execute({ path: "hello.txt" }, ctx);
      expect(result).toMatchObject({ path: "hello.txt", startLine: 1 });
      if (!("content" in result)) throw new Error("expected a text view");
      expect(result.content).toContain("|alpha");
      expect(result.content).toContain("|gamma");
    });

    test("read converts a PDF and reports the page count", async () => {
      const result = await read.execute({ path: "doc.pdf" }, ctx);
      expect(result).toMatchObject({ path: "doc.pdf", source: "pdf", pages: 2 });
    });

    test("read converts a PPTX and reports the slide count", async () => {
      const result = await read.execute({ path: "deck.pptx" }, ctx);
      expect(result).toMatchObject({ path: "deck.pptx", source: "pptx", slides: 2 });
      if (!("content" in result)) throw new Error("expected a text view");
      expect(result.content).toContain("Quarterly Review");
    });

    test("read converts a notebook and reports the cell count", async () => {
      const result = await read.execute({ path: "analysis.ipynb" }, ctx);
      expect(result).toMatchObject({ path: "analysis.ipynb", source: "ipynb", cells: 3 });
      if (!("content" in result)) throw new Error("expected a text view");
      expect(result.content).not.toContain("iVBORw0KGgo");
    });

    test("read attaches a small image and video stays metadata-only", async () => {
      const image = await read.execute({ path: "pic.png" }, ctx);
      expect(image).toMatchObject({ source: "image", format: "png" });
      expect(readChatAttachment(image)?.mediaType).toBe("image/png");

      const video = await read.execute({ path: "clip.mp4" }, ctx);
      expect(video).toMatchObject({ source: "video", format: "mp4" });
      expect(readChatAttachment(video)).toBeNull();
    });

    test("read fails clearly for a missing file and refuses escapes", async () => {
      expect(read.execute({ path: "nope.txt" }, ctx)).rejects.toThrow(/does not exist/);
      expect(read.execute({ path: "../outside.txt" }, ctx)).rejects.toThrow(/escapes/);
    });

    test("look reads the file's exact bytes through its IO", async () => {
      const sent: { data: unknown; mediaType: string | undefined }[] = [];
      const generateFn: LookGenerateFn = async (options) => {
        for (const message of options.messages) {
          if (!Array.isArray(message.content)) continue;
          for (const part of message.content) {
            if (typeof part === "object" && part !== null && part.type === "file") {
              sent.push({ data: part.data, mediaType: part.mediaType });
            }
          }
        }
        return { text: "seen" };
      };
      const look = createLookTool({
        workspace,
        noun,
        io,
        oracle: DEFAULT_MEDIA_ORACLE,
        generateFn,
      });
      const result = await look.execute({ path: "pic.png", prompt: "Describe." }, ctx);
      expect(result).toMatchObject({ media_type: "image/png", answer: "seen" });
      const part = sent[0];
      if (part === undefined) throw new Error("expected a file part");
      expect(part.mediaType).toBe("image/png");
      expect(part.data).toEqual(readFileSync(join(backend.root, "pic.png")));
    });

    test("read delivers dir conventions once per session through its IO", async () => {
      const fresh = backend.ctx(`conf-riders-${backend.name}`);
      const first = await read.execute({ path: "docs/guide.md" }, fresh);
      if (!("directory_conventions" in first)) throw new Error("expected riders");
      expect(first.directory_conventions).toEqual([
        { path: "docs/AGENTS.md", content: "# docs conventions\nBe brief." },
      ]);
      const second = await read.execute({ path: "docs/guide.md" }, fresh);
      expect("directory_conventions" in second).toBe(false);
    });

    test("write creates parents, edit replaces exactly", async () => {
      const written = await write.execute(
        { path: "notes/todo.md", content: "- ship it\n" },
        ctx,
      );
      expect(written).toEqual({ ok: true, path: "notes/todo.md", created: true, bytes: 10 });
      expect(readFileSync(join(backend.root, "notes/todo.md"), "utf8")).toBe("- ship it\n");

      const overwrite = await write.execute(
        { path: "notes/todo.md", content: "- done\n" },
        ctx,
      );
      expect(overwrite).toMatchObject({ created: false });

      await write.execute({ path: "edit-me.txt", content: "one two two\n" }, ctx);
      const edited = await edit.execute(
        { path: "edit-me.txt", old_string: "one", new_string: "1" },
        ctx,
      );
      expect(edited).toEqual({ ok: true, path: "edit-me.txt", replacements: 1, matched: "simple" });
      expect(readFileSync(join(backend.root, "edit-me.txt"), "utf8")).toBe("1 two two\n");

      expect(
        edit.execute({ path: "edit-me.txt", old_string: "two", new_string: "2" }, ctx),
      ).rejects.toThrow(/not unique/);
      const all = await edit.execute(
        { path: "edit-me.txt", old_string: "two", new_string: "2", replace_all: true },
        ctx,
      );
      expect(all).toMatchObject({ replacements: 2 });
      expect(edit.execute({ path: "ghost.txt", old_string: "x", new_string: "y" }, ctx))
        .rejects.toThrow(/does not exist/);
    });

    test("edit forgives near-miss indentation; edit and write preserve a BOM", async () => {
      await write.execute(
        { path: "forgive-me.ts", content: "\uFEFFif (ok) {\n    doThing();\n}\n" },
        ctx,
      );
      // The model remembered a tab indent; the file uses spaces — the
      // forgiving cascade resolves it via line_trimmed, and the leading BOM
      // survives the rewrite.
      const forgiven = await edit.execute(
        { path: "forgive-me.ts", old_string: "\tdoThing();", new_string: "\tdoOther();" },
        ctx,
      );
      expect(forgiven).toMatchObject({ ok: true, matched: "line_trimmed" });
      expect(readFileSync(join(backend.root, "forgive-me.ts"), "utf8")).toBe(
        "\uFEFFif (ok) {\n\tdoOther();\n}\n",
      );

      // write without a BOM onto a BOM'd file keeps the BOM.
      await write.execute({ path: "forgive-me.ts", content: "done\n" }, ctx);
      expect(readFileSync(join(backend.root, "forgive-me.ts"), "utf8")).toBe("\uFEFFdone\n");
    });

    test("glob matches at any depth without a leading **/", async () => {
      const result = await glob.execute({ pattern: "*.ts" }, ctx);
      expect(result.files).toContain("src/app.ts");
    });

    test("grep finds matching lines with file and line number", async () => {
      const result = await grep.execute({ pattern: "answer = [0-9]+" }, ctx);
      expect(result.matches).toEqual([
        { file: "src/app.ts", line: 1, text: "export const answer = 42; // the answer" },
      ]);
      expect(result.truncated).toBe(false);
    });

    test("grep scopes to a directory and filters by glob", async () => {
      const scoped = await grep.execute({ pattern: "answer", path: "src" }, ctx);
      expect(scoped.count).toBe(1);
      const filtered = await grep.execute({ pattern: "alpha", glob: "**/*.ts" }, ctx);
      expect(filtered.count).toBe(0);
    });

    test("grep overflow spills the complete list through its IO", async () => {
      const result = await grep.execute(
        { pattern: "^needle", path: "many.txt", max_results: 10 },
        ctx,
      );
      expect(result).toMatchObject({ truncated: true, count: 10, totalMatches: 60 });
      if (result.note === undefined) throw new Error("expected a note");
      const named = result.note.match(/at (\S+) —/);
      if (!named?.[1]) throw new Error(`note names no spill file: ${result.note}`);
      const spilled = readFileSync(workspace.resolve(named[1]), "utf8").trimEnd().split("\n");
      expect(spilled).toHaveLength(60);
      expect(spilled[0]).toBe("many.txt:1: needle line 0");
    });

    test("grep without a spill dir stops at the cap honestly", async () => {
      const capped = createGrepTool({ workspace, noun, io });
      const result = await capped.execute(
        { pattern: "^needle", path: "many.txt", max_results: 10 },
        ctx,
      );
      expect(result).toMatchObject({ truncated: true, count: 10 });
      expect("totalMatches" in result).toBe(false);
      if (result.note === undefined) throw new Error("expected a note");
      expect(result.note).toContain("more matches may exist");
    });

    test("grep rejects an invalid regex before any backend work", async () => {
      expect(grep.execute({ pattern: "(" }, ctx)).rejects.toThrow(/Invalid regular expression/);
    });
  });
}
