import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBashOp } from "./backgroundable";
import { createCommandRunner } from "./run";
import { createWorkspace } from "./workspace";

const root = mkdtempSync(join(tmpdir(), "stdlib-bg-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const runner = createCommandRunner({
  workspace: createWorkspace(root),
  spillDir: join(root, ".state", "tool-outputs"),
});
const bashOp = createBashOp(runner);

describe("createBashOp", () => {
  test("surfaces a JSON Schema describing the command field", () => {
    expect(bashOp.name).toBe("bash");
    expect(bashOp.description.length).toBeGreaterThan(0);
    // The op erases its input type but surfaces the schema so the model knows
    // what to pass; it must describe the `command` field.
    expect(JSON.stringify(bashOp.inputJsonSchema)).toContain("command");
  });

  test("runs a command through the runner and resolves its result", async () => {
    const started = bashOp.start({ command: "printf hi" });
    expect(started.label).toBe("printf hi");
    // start() erases the op's result type, so assert on the shape.
    expect(await started.work).toMatchObject({ stdout: "hi", exitCode: 0 });
  });
});

describe("BackgroundableOp.start", () => {
  test("throws a named error when required input is missing", () => {
    expect(() => bashOp.start({})).toThrow(/Invalid input for "bash"/);
  });

  test("throws when a field is the wrong type", () => {
    expect(() => bashOp.start({ command: 42 })).toThrow(/Invalid input for "bash"/);
    expect(() => bashOp.start({ command: "" })).toThrow(/Invalid input for "bash"/);
  });

  test("the rejection is prettified and states nothing was started", () => {
    // z.prettifyError, not error.message (a JSON issue dump): the model
    // reads the message verbatim, so it must name the offending field and
    // the recovery action in prose.
    let message = "";
    try {
      bashOp.start({ command: 42 });
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain("nothing was started");
    expect(message).toContain("command"); // the offending field, named
    expect(message).not.toContain('"code"'); // no raw zod issue JSON
  });
});
