import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "eve/tools";
import { readChatAttachment } from "./attachments";
import {
  buildTaskDescription,
  buildTaskMarkdown,
  createTaskAgent,
  createTaskChildTools,
  expectedTaskToolNames,
  fetchGatewayModelCatalog,
  parseGatewayModelCatalog,
  TASK_CHILD_TOOL_OVERRIDES,
  TASK_DISABLED_BUILTINS,
} from "./task";
import { visibleReasoningModelOptions } from "./visible-reasoning";

describe("expectedTaskToolNames", () => {
  test("parent tools minus exclusions plus the disable shims, sorted", () => {
    expect(
      expectedTaskToolNames({
        parentToolNames: ["bash", "read", "write", "render_ui"],
        excludedParentTools: ["render_ui"],
      }),
    ).toEqual(["ask_question", "bash", "read", "write"]);
  });

  test("no exclusions means the full parent surface plus the shims", () => {
    expect(expectedTaskToolNames({ parentToolNames: ["bash", "read"] })).toEqual([
      "ask_question",
      "bash",
      "read",
    ]);
  });

  test("an exclusion that names no parent tool throws (stale-exclusion guard)", () => {
    expect(() =>
      expectedTaskToolNames({
        parentToolNames: ["bash"],
        excludedParentTools: ["render_ui"],
      }),
    ).toThrow('"render_ui"');
  });

  test("a parent tool colliding with a disabled builtin throws", () => {
    expect(() =>
      expectedTaskToolNames({ parentToolNames: ["ask_question", "bash"] }),
    ).toThrow('"ask_question"');
  });

  test("only ask_question is shimmed — parity with the parent everywhere else", () => {
    // A parked child parks the parent's turn; everything else follows the
    // parent (authored tools re-export, untouched builtins stay default).
    expect([...TASK_DISABLED_BUILTINS]).toEqual(["ask_question"]);
  });
});

describe("the task instruction", () => {
  test("covers the load-bearing rules and interpolates the noun", () => {
    const markdown = buildTaskMarkdown({ workspaceNoun: "repo" });
    expect(markdown).toContain("## Working as a delegated task");
    expect(markdown).toContain("task in this repo");
    expect(markdown).toContain("final message is your entire deliverable");
    expect(markdown).toContain("paths and line references");
    expect(markdown).toContain("thoroughness");
    // No ask_question in the child: decide-and-report is the contract.
    expect(markdown).toContain("Decide, don't ask");
    expect(markdown).toContain("report the blocker as your result");
    // Write-capable children share the write-scope rule.
    expect(markdown).toContain("write scope");
    // The `agent` clone can't be shimmed away; the instruction bounds it.
    expect(markdown).toContain("never chain delegations more than one level");
    // Default noun.
    expect(buildTaskMarkdown()).toContain("task in this workspace");
  });
});

describe("buildTaskDescription", () => {
  test("carries the model identity, the routing use, and the delegation contract", () => {
    const description = buildTaskDescription({
      modelName: "Claude Sonnet 5",
      use: "Prefer it for quick, well-scoped subtasks.",
      modelBlurb: "Top-tier intelligence at Sonnet pricing.",
      workspaceNoun: "repo",
    });
    expect(description).toContain("pinned to Claude Sonnet 5");
    expect(description).toContain("same repo");
    // Honest about the child's limits: no HITL, decide-and-report.
    expect(description).toContain("cannot ask the user");
    expect(description).toContain("Prefer it for quick, well-scoped subtasks.");
    expect(description).toContain("none of your history");
    expect(description).toContain("non-overlapping write scopes");
    expect(description).toContain(
      "About Claude Sonnet 5: Top-tier intelligence at Sonnet pricing.",
    );
    // It must not claim tool parity the consumer may not have.
    expect(description).not.toContain("full-capability");
    expect(description).not.toContain("same repo and tools");
  });

  test("a capabilityNote lands between the contract and the routing use", () => {
    const description = buildTaskDescription({
      modelName: "M",
      use: "Use it for X.",
      capabilityNote: "Compared to you it lacks the cockpit tools.",
    });
    expect(description).toContain("Compared to you it lacks the cockpit tools.");
    expect(description.indexOf("cannot ask the user")).toBeLessThan(
      description.indexOf("Compared to you"),
    );
  });

  test("omits the blurb sentence when there is no blurb", () => {
    const description = buildTaskDescription({
      modelName: "Claude Opus 4.8",
      use: "Reach for it on hard reasoning.",
    });
    expect(description).not.toContain("About Claude Opus 4.8");
    expect(description).toContain("same workspace");
  });
});

describe("createTaskChildTools", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-task-child-")));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  // A 1x1 PNG so the image path is exercised without a fixture dependency.
  writeFileSync(
    join(root, "pic.png"),
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  const tools = createTaskChildTools({
    workspaceRoot: root,
    workspaceNoun: "repo",
    spillDir: join(root, ".state/tool-outputs"),
  });

  const ctx: ToolContext = {
    session: {
      id: "task-child-session",
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

  test("exports exactly the override names", () => {
    expect(Object.keys(tools).sort()).toEqual([...TASK_CHILD_TOOL_OVERRIDES].sort());
  });

  test("images never inline as chat attachments (no park-delivery hook in the child)", async () => {
    const result = await tools.read.execute({ path: "pic.png" }, ctx);
    expect(result).toMatchObject({ path: "pic.png", source: "image" });
    expect(readChatAttachment(result)).toBeNull();
    if (!("note" in result) || typeof result.note !== "string") throw new Error("expected a note");
    // The note must not promise an attachment or tell the child to ask the user.
    expect(result.note).not.toContain("ask the user");
    expect(result.note).not.toContain("next message");
    expect(result.note).toContain("report the image's path");
  });

  test("the read description doesn't promise the attachment path it lacks", () => {
    expect(tools.read.description).toContain("metadata only");
    expect(tools.read.description).not.toContain("viewable attachment");
  });
});

describe("createTaskAgent", () => {
  test("defaults the description to the parent-facing routing text", () => {
    const agent = createTaskAgent({
      model: "anthropic/claude-sonnet-5",
      modelName: "Claude Sonnet 5",
      use: "Prefer it for quick subtasks.",
    });
    expect(agent.model).toBe("anthropic/claude-sonnet-5");
    expect(agent.description).toBe(
      buildTaskDescription({
        modelName: "Claude Sonnet 5",
        use: "Prefer it for quick subtasks.",
      }),
    );
    expect(agent.reasoning).toBeUndefined();
  });

  test("passes through a custom description and reasoning", () => {
    const agent = createTaskAgent({
      model: "m",
      modelName: "M",
      use: "Use it.",
      description: "my worker",
      reasoning: "low",
    });
    expect(agent.description).toBe("my worker");
    expect(agent.reasoning).toBe("low");
  });

  test("defaults modelOptions to the slug's visible-reasoning options", () => {
    const agent = createTaskAgent({
      model: "anthropic/claude-sonnet-5",
      modelName: "Claude Sonnet 5",
      use: "Use it.",
    });
    expect(agent.modelOptions).toEqual(
      visibleReasoningModelOptions("anthropic/claude-sonnet-5"),
    );
  });

  test("leaves modelOptions unset for models with visible defaults, and honors an explicit override", () => {
    const visibleByDefault = createTaskAgent({
      model: "openai/gpt-5.5",
      modelName: "GPT-5.5",
      use: "Use it.",
    });
    expect(visibleByDefault.modelOptions).toBeUndefined();

    const overridden = createTaskAgent({
      model: "anthropic/claude-sonnet-5",
      modelName: "Claude Sonnet 5",
      use: "Use it.",
      modelOptions: { providerOptions: { anthropic: {} } },
    });
    expect(overridden.modelOptions).toEqual({ providerOptions: { anthropic: {} } });
  });
});

describe("parseGatewayModelCatalog", () => {
  const entry = {
    id: "anthropic/claude-sonnet-5",
    name: "Claude Sonnet 5",
    description: "An upgrade to Sonnet 4.6.",
  };

  test("parses a valid catalog body", () => {
    expect(parseGatewayModelCatalog({ data: [entry] })).toEqual([
      {
        id: "anthropic/claude-sonnet-5",
        name: "Claude Sonnet 5",
        description: "An upgrade to Sonnet 4.6.",
      },
    ]);
  });

  test("missing optional fields become undefined", () => {
    expect(parseGatewayModelCatalog({ data: [{ id: "x" }] })).toEqual([
      { id: "x", name: undefined, description: undefined },
    ]);
  });

  test("wrong-typed fields degrade to undefined; a missing id rejects", () => {
    expect(parseGatewayModelCatalog({ data: [{ id: "x", name: 3 }] })).toEqual([
      { id: "x", name: undefined, description: undefined },
    ]);
    expect(parseGatewayModelCatalog({ data: [{ name: "no id" }] })).toBeNull();
  });

  test("non-object bodies and non-array data reject", () => {
    expect(parseGatewayModelCatalog(null)).toBeNull();
    expect(parseGatewayModelCatalog("nope")).toBeNull();
    expect(parseGatewayModelCatalog({ data: "nope" })).toBeNull();
  });
});

describe("fetchGatewayModelCatalog", () => {
  test("fetches and parses through an injected fetch", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ data: [{ id: "x", name: "X" }] }), {
        status: 200,
      });
    const models = await fetchGatewayModelCatalog({ url: "https://example.test", fetchImpl });
    expect(models).toEqual([{ id: "x", name: "X", description: undefined }]);
  });

  test("a non-2xx status throws", async () => {
    const fetchImpl = async () => new Response("nope", { status: 503 });
    await expect(
      fetchGatewayModelCatalog({ url: "https://example.test", fetchImpl }),
    ).rejects.toThrow("503");
  });

  test("a malformed body throws", async () => {
    const fetchImpl = async () => new Response(JSON.stringify({ nope: true }), { status: 200 });
    await expect(
      fetchGatewayModelCatalog({ url: "https://example.test", fetchImpl }),
    ).rejects.toThrow("unexpected shape");
  });
});
