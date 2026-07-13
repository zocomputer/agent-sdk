import { describe, expect, test } from "bun:test";
import {
  buildTaskDescription,
  buildTaskMarkdown,
  createTaskAgent,
  expectedTaskToolNames,
  fetchGatewayModelCatalog,
  parseGatewayModelCatalog,
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
    // The `agent` clone can't be shimmed away, but Eve's depth limit rejects it.
    expect(markdown).toContain("Do not delegate onward");
    expect(markdown).toContain("default delegation depth");
    // Default noun.
    expect(buildTaskMarkdown()).toContain("task in this workspace");
  });

  test("specifies the return shape — a distilled report is what makes delegation pay", () => {
    // A subagent's value is measured in context kept OUT of the parent: an
    // explicit return spec (structured sections, a token target, and the
    // don't-include list) is what turns "report back" into a bounded return.
    const markdown = buildTaskMarkdown();
    expect(markdown).toContain("Structure your final report");
    expect(markdown).toContain("**Findings**");
    expect(markdown).toContain("**Recommendation**");
    expect(markdown).toContain("**Artifacts**");
    expect(markdown).toContain("full file contents");
    expect(markdown).toContain("transcript of your exploration");
    expect(markdown).toContain("500–1500 tokens");
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

  test("never claims tier-model media viewing — a child gets no inline media regardless", () => {
    // A delegated child's read/webfetch are attach-disabled, so a "this
    // tier's model can view images" sentence would invite routing
    // image-heavy work to a child that only gets metadata plus `look`.
    const description = buildTaskDescription({
      modelName: "Claude Sonnet 5",
      use: "Use it for quick subtasks.",
    });
    expect(description).not.toContain("itself can view");
    expect(description).not.toContain("can view images");
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
    context_window: 1_000_000,
    max_tokens: 64_000,
  };
  const emptyOptionals = {
    name: undefined,
    description: undefined,
    tags: undefined,
    contextWindow: undefined,
    maxOutputTokens: undefined,
  };

  test("parses a valid catalog body", () => {
    expect(parseGatewayModelCatalog({ data: [entry] })).toEqual([
      {
        id: "anthropic/claude-sonnet-5",
        name: "Claude Sonnet 5",
        description: "An upgrade to Sonnet 4.6.",
        tags: undefined,
        contextWindow: 1_000_000,
        maxOutputTokens: 64_000,
      },
    ]);
  });

  test("missing optional fields become undefined", () => {
    expect(parseGatewayModelCatalog({ data: [{ id: "x" }] })).toEqual([
      { id: "x", ...emptyOptionals },
    ]);
  });

  test("wrong-typed fields degrade to undefined; a missing id rejects", () => {
    expect(parseGatewayModelCatalog({ data: [{ id: "x", name: 3 }] })).toEqual([
      { id: "x", ...emptyOptionals },
    ]);
    expect(parseGatewayModelCatalog({ data: [{ name: "no id" }] })).toBeNull();
  });

  test("string-array tags parse; non-string entries degrade the whole list", () => {
    expect(
      parseGatewayModelCatalog({ data: [{ id: "x", tags: ["vision", "file-input"] }] }),
    ).toEqual([
      {
        id: "x",
        ...emptyOptionals,
        tags: ["vision", "file-input"],
      },
    ]);
    const mixed = parseGatewayModelCatalog({ data: [{ id: "x", tags: ["vision", 3] }] });
    expect(mixed?.[0]?.tags).toBeUndefined();
  });

  test("non-positive, fractional, or wrong-typed window fields degrade to undefined", () => {
    const parsed = parseGatewayModelCatalog({
      data: [
        { id: "a", context_window: 0, max_tokens: -1 },
        { id: "b", context_window: 12.5, max_tokens: "64000" },
      ],
    });
    expect(parsed?.map((m) => [m.contextWindow, m.maxOutputTokens])).toEqual([
      [undefined, undefined],
      [undefined, undefined],
    ]);
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
    expect(models).toEqual([
      {
        id: "x",
        name: "X",
        description: undefined,
        tags: undefined,
        contextWindow: undefined,
        maxOutputTokens: undefined,
      },
    ]);
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
