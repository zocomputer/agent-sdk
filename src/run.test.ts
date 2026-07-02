import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCommandRunner } from "./run";
import { createWorkspace } from "./workspace";

// The bounding/spill logic lives in bounded-output.ts with its own unit tests;
// these are thin integration checks that the shell glue wires it up.

const root = mkdtempSync(join(tmpdir(), "stdlib-run-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const runner = createCommandRunner({
  workspace: createWorkspace(root),
  spillDir: join(root, ".state", "tool-outputs"),
});

test("captures stdout, stderr, and the exit code", async () => {
  const result = await runner.runCommand("printf out; printf err >&2; exit 3");
  expect(result.stdout).toBe("out");
  expect(result.stderr).toBe("err");
  expect(result.exitCode).toBe(3);
  expect(result.timedOut).toBe(false);
});

// sleep 30, not 5: if the kill regresses, the runner waits out the sleep and
// the test's own timeout fails it, instead of passing at the sleep's natural
// exit with timedOut=true.
test(
  "a timed-out command is killed and flagged",
  async () => {
    const result = await runner.runCommand("sleep 30", { timeoutMs: 100 });
    expect(result.timedOut).toBe(true);
  },
  10_000,
);

test(
  "the timeout kill takes grandchildren with it",
  async () => {
    // The subshell grandchild inherits the stdio pipes; killing only the shell
    // would leave it holding them (and running) for 30s. Group kill ends both.
    const result = await runner.runCommand("(sleep 30; echo late) & wait", { timeoutMs: 100 });
    expect(result.timedOut).toBe(true);
    expect(result.stdout).toBe("");
  },
  10_000,
);

test("commands run rooted at the workspace", async () => {
  const result = await runner.runCommand("pwd");
  // realpath: macOS tmpdir is a /private symlink and `pwd` reports the target.
  expect(result.stdout.trim()).toBe(realpathSync(root));
});
