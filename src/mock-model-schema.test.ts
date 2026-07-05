// Schema drift guard: the mock's scripted `ask_question` and `todo` inputs
// are hand-written, but the real tools they target are eve's framework tools
// with eve-owned JSON schemas. If eve renames a field, tightens an enum, or
// adds a required property, a hand-written input goes stale SILENTLY — the
// scenario then exercises the cockpits against a tool error nobody scripted.
// This suite validates every scripted input against the schemas the installed
// eve actually ships, so drift fails here with the exact violation instead of
// surfacing as a confusing cockpit repro.
//
// The schemas live in eve's runtime internals (not a public subpath), so they
// are loaded by file path relative to eve's package.json — deliberately: if
// eve moves the module, this test fails loudly and gets updated, which is
// exactly the drift-detection contract.
import { describe, expect, test } from "bun:test";
import { MOCK_SCENARIOS, scriptActionFor, type MockScriptedScenario } from "./mock-model";

// --- Minimal JSON Schema conformance (the subset eve's tool schemas use) ----

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Violations of `value` against `schema`, for the JSON Schema subset eve's
 * framework-tool schemas use: `type` (object/array/string/boolean/number),
 * `properties` + `required` + `additionalProperties: false`, `items`, `enum`.
 * Unknown schema keywords fail loudly rather than silently passing, so a new
 * eve constraint can't be skipped by accident.
 */
function schemaViolations(value: unknown, schema: unknown, path = "$"): string[] {
  if (!isRecord(schema)) return [`${path}: schema is not an object`];
  const violations: string[] = [];

  const supported = new Set([
    "type",
    "properties",
    "required",
    "additionalProperties",
    "items",
    "enum",
    "description",
  ]);
  for (const keyword of Object.keys(schema)) {
    if (!supported.has(keyword)) {
      violations.push(`${path}: unsupported schema keyword "${keyword}" — extend the validator`);
    }
  }

  if (Array.isArray(schema.enum)) {
    if (!schema.enum.some((candidate) => candidate === value)) {
      violations.push(`${path}: ${JSON.stringify(value)} not in enum ${JSON.stringify(schema.enum)}`);
    }
    return violations;
  }

  switch (schema.type) {
    case "object": {
      if (!isRecord(value)) return [...violations, `${path}: expected object`];
      const properties = isRecord(schema.properties) ? schema.properties : {};
      const required = Array.isArray(schema.required) ? schema.required : [];
      for (const key of required) {
        if (typeof key === "string" && !(key in value)) {
          violations.push(`${path}: missing required property "${key}"`);
        }
      }
      for (const [key, propertyValue] of Object.entries(value)) {
        const propertySchema = properties[key];
        if (propertySchema === undefined) {
          if (schema.additionalProperties === false) {
            violations.push(`${path}: unexpected property "${key}"`);
          }
          continue;
        }
        violations.push(...schemaViolations(propertyValue, propertySchema, `${path}.${key}`));
      }
      return violations;
    }
    case "array": {
      if (!Array.isArray(value)) return [...violations, `${path}: expected array`];
      if (schema.items !== undefined) {
        for (const [index, item] of value.entries()) {
          violations.push(...schemaViolations(item, schema.items, `${path}[${index}]`));
        }
      }
      return violations;
    }
    case "string":
      if (typeof value !== "string") violations.push(`${path}: expected string`);
      return violations;
    case "boolean":
      if (typeof value !== "boolean") violations.push(`${path}: expected boolean`);
      return violations;
    case "number":
    case "integer":
      if (typeof value !== "number") violations.push(`${path}: expected number`);
      return violations;
    default:
      return [...violations, `${path}: unsupported schema type ${JSON.stringify(schema.type)}`];
  }
}

// --- Load the installed eve's framework-tool schemas ------------------------

async function loadEveInternal(relativePath: string): Promise<Record<string, unknown>> {
  const packageJsonUrl = import.meta.resolve("eve/package.json");
  const moduleUrl = new URL(relativePath, packageJsonUrl).href;
  const loaded: unknown = await import(moduleUrl);
  if (!isRecord(loaded)) throw new Error(`eve internal module ${relativePath} did not load`);
  return loaded;
}

async function askQuestionInputSchema(): Promise<unknown> {
  const module = await loadEveInternal("dist/src/runtime/framework-tools/ask-question.js");
  const schema = module.ASK_QUESTION_INPUT_SCHEMA;
  if (!isRecord(schema)) throw new Error("eve no longer exports ASK_QUESTION_INPUT_SCHEMA");
  return schema;
}

async function todoInputSchema(): Promise<unknown> {
  const module = await loadEveInternal("dist/src/runtime/framework-tools/todo.js");
  const definition = module.TODO_TOOL_DEFINITION;
  if (!isRecord(definition) || !isRecord(definition.inputSchema)) {
    throw new Error("eve no longer exports TODO_TOOL_DEFINITION.inputSchema");
  }
  return definition.inputSchema;
}

// --- The suite ---------------------------------------------------------------

/** Every scripted tool call across every scenario and step, flattened. */
function allScriptedCalls(): readonly {
  scenario: MockScriptedScenario;
  step: number;
  toolName: string;
  input: Record<string, unknown>;
}[] {
  const scripted = MOCK_SCENARIOS.filter(
    (s): s is MockScriptedScenario =>
      s === "hitl" || s === "parallel" || s === "todo" || s === "explore",
  );
  const calls: {
    scenario: MockScriptedScenario;
    step: number;
    toolName: string;
    input: Record<string, unknown>;
  }[] = [];
  for (const scenario of scripted) {
    for (let step = 0; step < 10; step++) {
      const action = scriptActionFor(scenario, step);
      if (action.kind === "text") break;
      for (const call of action.calls) {
        calls.push({ scenario, step, toolName: call.toolName, input: call.input });
      }
    }
  }
  return calls;
}

describe("scripted inputs conform to eve's live tool schemas", () => {
  test("every ask_question input validates against ASK_QUESTION_INPUT_SCHEMA", async () => {
    const schema = await askQuestionInputSchema();
    const calls = allScriptedCalls().filter((c) => c.toolName === "ask_question");
    expect(calls.length).toBeGreaterThanOrEqual(3); // hitl ×1, parallel ×2
    for (const call of calls) {
      expect({
        scenario: call.scenario,
        step: call.step,
        violations: schemaViolations(call.input, schema),
      }).toEqual({ scenario: call.scenario, step: call.step, violations: [] });
    }
  });

  test("every todo input validates against TODO_TOOL_DEFINITION.inputSchema", async () => {
    const schema = await todoInputSchema();
    const calls = allScriptedCalls().filter((c) => c.toolName === "todo");
    expect(calls.length).toBeGreaterThanOrEqual(2); // write, then update
    for (const call of calls) {
      expect({
        scenario: call.scenario,
        step: call.step,
        violations: schemaViolations(call.input, schema),
      }).toEqual({ scenario: call.scenario, step: call.step, violations: [] });
    }
  });

  test("the explore delegation carries a non-empty message", () => {
    // The declared-subagent input schema is eve-owned and not exported, so
    // pin the one field the delegation contract needs (see ./explore.ts).
    const calls = allScriptedCalls().filter((c) => c.scenario === "explore");
    expect(calls.length).toBe(1);
    const message = calls[0]?.input.message;
    expect(typeof message).toBe("string");
    expect(String(message).length).toBeGreaterThan(0);
  });

  test("the validator itself catches drift-shaped mistakes", async () => {
    const schema = await askQuestionInputSchema();
    // A missing prompt, a bad style enum, and an unknown property must all
    // register — otherwise the conformance tests above prove nothing.
    expect(schemaViolations({}, schema)).toContain('$: missing required property "prompt"');
    expect(
      schemaViolations(
        { prompt: "p", options: [{ id: "a", label: "A", style: "sparkly" }] },
        schema,
      ).join("\n"),
    ).toContain("not in enum");
    expect(schemaViolations({ prompt: "p", bogus: true }, schema)).toContain(
      '$: unexpected property "bogus"',
    );
  });
});
