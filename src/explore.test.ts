import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "eve/tools";
import { readImageChatAttachment } from "./attachments";
import {
  buildExploreDescription,
  buildExploreMarkdown,
  createExploreAgent,
  createExploreTools,
  EXPLORE_DISABLED_BUILTINS,
  EXPLORE_TOOL_NAMES,
} from "./explore";

// One temp workspace shared by the suite; realpath because macOS's tmpdir is
// a /private symlink and workspace paths must be canonical.
const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-explore-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));

mkdirSync(join(root, "src"), { recursive: true });
writeFileSync(join(root, "src/app.ts"), "export const answer = 42;\n");
writeFileSync(join(root, "src/AGENTS.md"), "# src conventions\nBe brief.\n");
// A 1x1 PNG so the image path is exercised without a fixture dependency.
writeFileSync(
  join(root, "pic.png"),
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

const tools = createExploreTools({ workspaceRoot: root, workspaceNoun: "repo" });

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
const ctx = ctxWith("explore-session");

describe("the manifests", () => {
  test("toolset names and disabled builtins don't overlap", () => {
    const overlap = EXPLORE_TOOL_NAMES.filter((name) =>
      (EXPLORE_DISABLED_BUILTINS as readonly string[]).includes(name),
    );
    expect(overlap).toEqual([]);
  });

  test("every non-read framework builtin is on the disable list", () => {
    // The full default harness minus the overridden read tools: anything that
    // writes (bash, write_file), parks (ask_question), reaches the web
    // (web_fetch, web_search), or pads the one-question surface (todo,
    // load_skill). read_file is vacated in favor of `read`. The `agent` clone
    // tool is NOT disableable — eve injects it at the harness layer, and a
    // shim for it fails runtime graph resolution (breaks every session).
    expect([...EXPLORE_DISABLED_BUILTINS].sort()).toEqual([
      "ask_question",
      "bash",
      "load_skill",
      "read_file",
      "todo",
      "web_fetch",
      "web_search",
      "write_file",
    ]);
  });

  test("createExploreTools returns exactly the manifest's tools", () => {
    expect(Object.keys(tools).sort()).toEqual([...EXPLORE_TOOL_NAMES].sort());
  });
});

describe("createExploreTools", () => {
  test("read returns a line-numbered window and interpolates the noun", async () => {
    expect(tools.read.description).toContain("Read a file from the repo");
    const result = await tools.read.execute({ path: "src/app.ts" }, ctx);
    if (!("content" in result)) throw new Error("expected a text view");
    expect(result.content).toContain("|export const answer = 42;");
  });

  test("glob and grep search the workspace", async () => {
    const globbed = await tools.glob.execute({ pattern: "*.ts" }, ctx);
    expect(globbed.files).toContain("src/app.ts");
    const grepped = await tools.grep.execute({ pattern: "answer = \\d+" }, ctx);
    expect(grepped.count).toBe(1);
  });

  test("dir-conventions riders deliver on the first read (default on)", async () => {
    const fresh = ctxWith("explore-riders");
    const result = await tools.read.execute({ path: "src/app.ts" }, fresh);
    if (!("directory_conventions" in result)) throw new Error("expected riders");
    expect(result.directory_conventions).toEqual([
      { path: join("src", "AGENTS.md"), content: "# src conventions\nBe brief." },
    ]);
  });

  test("images never inline as chat attachments (no park-delivery hook in the child)", async () => {
    const result = await tools.read.execute({ path: "pic.png" }, ctx);
    expect(result).toMatchObject({ path: "pic.png", source: "image" });
    expect(readImageChatAttachment(result)).toBeNull();
    // The note must not tell an ask_question-less child to ask the user.
    if (!("note" in result) || typeof result.note !== "string") throw new Error("expected a note");
    expect(result.note).not.toContain("ask the user");
    expect(result.note).toContain("report the image's path");
  });

  test("the read description doesn't promise attachment or edit paths it lacks", () => {
    // No park-delivery hook in the child → metadata only; no edit tool → no
    // read-before-edit guidance.
    expect(tools.read.description).toContain("metadata only");
    expect(tools.read.description).not.toContain("viewable attachment");
    expect(tools.read.description).not.toContain("editing");
  });

  test("the too-large error says report-to-caller, not disabled or useless paths", async () => {
    writeFileSync(join(root, "big.txt"), Buffer.alloc(10_000_001, 0x61));
    let message = "";
    try {
      await tools.read.execute({ path: "big.txt" }, ctx);
    } catch (error: unknown) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("too large to read");
    // bash is disabled; offset/limit can't help (the size check throws before
    // windowing); grep skips oversized files. Reporting is the honest move.
    expect(message).not.toContain("bash");
    expect(message).not.toContain("offset");
    expect(message).toContain("report its path and size");
  });
});

describe("the explore instruction", () => {
  test("covers the load-bearing rules and interpolates the noun", () => {
    const markdown = buildExploreMarkdown({ workspaceNoun: "repo" });
    expect(markdown).toContain("## Exploring (read-only)");
    expect(markdown).toContain("question about this repo");
    expect(markdown).toContain("final message is your entire deliverable");
    expect(markdown).toContain("paths and line references");
    expect(markdown).toContain("thoroughness");
    expect(markdown).toContain("Never guess silently");
    // The `agent` clone tool can't be shimmed away (eve injects it at the
    // harness layer), so the instruction is the recursion guard.
    expect(markdown).toContain("never delegate");
    // Default noun.
    expect(buildExploreMarkdown()).toContain("question about this workspace");
  });
});

describe("createExploreAgent", () => {
  test("defaults the description to the parent-facing routing text", () => {
    const agent = createExploreAgent({ model: "anthropic/claude-haiku-4.5" });
    expect(agent.model).toBe("anthropic/claude-haiku-4.5");
    expect(agent.description).toBe(buildExploreDescription());
    expect(agent.description).toContain("read-only");
    expect(agent.description).toContain("cannot edit");
    expect(agent.description).toContain("in parallel");
    expect(agent.description).toContain("thoroughness");
    expect(agent.reasoning).toBeUndefined();
  });

  test("passes through noun, custom description, and reasoning", () => {
    expect(
      createExploreAgent({ model: "m", workspaceNoun: "repo" }).description,
    ).toContain("read-only repo exploration");
    const custom = createExploreAgent({
      model: "m",
      description: "my explorer",
      reasoning: "low",
    });
    expect(custom.description).toBe("my explorer");
    expect(custom.reasoning).toBe("low");
  });
});
