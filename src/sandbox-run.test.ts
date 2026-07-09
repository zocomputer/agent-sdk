import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import {
  createSandboxRunner,
  sandboxRunnerProvider,
  type SandboxProcessLike,
} from "./sandbox-run";
import { createFakeSandboxSession, toWebStream } from "./workspace-io.test-helpers";
import type { IoToolContext, SandboxSessionLike } from "./workspace-io";

// The fake session executes against a local temp dir with a real /bin/sh and
// real child processes behind web streams, so these tests exercise the actual
// pump/settle/spill machinery — only the transport is faked.

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sbx-run-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const makeRunner = (opts: { spillDir?: string; session?: SandboxSessionLike } = {}) =>
  createSandboxRunner({
    root,
    session: async () => opts.session ?? createFakeSandboxSession(root),
    spillDir: opts.spillDir,
  });

describe("createSandboxRunner", () => {
  test("runs a command in the sandbox root and returns its output", async () => {
    const runner = makeRunner();
    const result = await runner.runCommand("echo hello-sandbox; echo oops >&2");
    expect(result.stdout).toBe("hello-sandbox\n");
    expect(result.stderr).toBe("oops\n");
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
  });

  test("a failing command reports its real exit code", async () => {
    const runner = makeRunner();
    const result = await runner.runCommand("exit 3");
    expect(result.exitCode).toBe(3);
    expect(result.timedOut).toBe(false);
  });

  test("cwd resolves inside the root; an escaping cwd throws before any spawn", async () => {
    const runner = makeRunner();
    const inSub = await runner.runCommand("pwd", { cwd: "sub/../." });
    expect(inSub.stdout.trim().endsWith(root.split("/").pop() ?? "")).toBe(true);
    expect(() => runner.startCommand("pwd", { cwd: "../outside" })).toThrow();
  });

  test("onOutput streams chunks and progress() previews live output", async () => {
    const runner = makeRunner();
    const seen: string[] = [];
    const running = runner.startCommand("printf 'first'; sleep 0.15; printf 'second'", {
      onOutput: (chunk) => seen.push(chunk),
    });
    // Wait for the first chunk, then check the live preview mid-command.
    const deadline = Date.now() + 2_000;
    while (!seen.join("").includes("first") && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(running.progress().stdout).toContain("first");
    const result = await running.result;
    expect(result.stdout).toBe("firstsecond");
    expect(seen.join("")).toBe("firstsecond");
  });

  test("a timeout kills the command and flags timedOut", async () => {
    const runner = makeRunner();
    const result = await runner.runCommand("sleep 5", { timeoutMs: 100 });
    expect(result.timedOut).toBe(true);
  }, 3_000);

  test("kill() settles a long-running command early", async () => {
    const runner = makeRunner();
    const running = runner.startCommand("sleep 10");
    await new Promise((resolve) => setTimeout(resolve, 50));
    running.kill();
    const result = await running.result;
    expect(result.timedOut).toBe(false);
  }, 3_000);

  test("a kill settles even when the transport never closes the streams", async () => {
    // The remote-transport worst case (and the observed Linux CI behavior
    // with 'close'-based waits): the process dies and wait() resolves, but
    // the stdio streams never emit end. The post-exit drain grace must
    // cancel the readers and settle instead of hanging forever.
    let onKill: () => void = () => undefined;
    const neverClosing: SandboxProcessLike = {
      stdout: new ReadableStream<Uint8Array>(),
      stderr: new ReadableStream<Uint8Array>(),
      wait: () =>
        new Promise<{ exitCode: number }>((resolve) => {
          onKill = () => resolve({ exitCode: 137 });
        }),
      kill: async () => onKill(),
    };
    const session = { ...createFakeSandboxSession(root), spawn: async () => neverClosing };
    const runner = makeRunner({ session });
    const result = await runner.runCommand("sleep 999", { timeoutMs: 50 });
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(137);
  }, 5_000);

  test("the timeout bounds a stuck session resolution", async () => {
    // Bugbot's high-severity case: the connect phase (session + spawn) must
    // be covered by timeoutMs, or a stuck SSH setup hangs the tool forever.
    const runner = createSandboxRunner({
      root,
      session: () => new Promise(() => undefined), // never resolves
    });
    const result = await runner.runCommand("echo hi", { timeoutMs: 50 });
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
  }, 3_000);

  test("kill() settles a command whose spawn never returns", async () => {
    const stuck = {
      ...createFakeSandboxSession(root),
      spawn: () => new Promise<SandboxProcessLike>(() => undefined),
    };
    const runner = makeRunner({ session: stuck });
    const running = runner.startCommand("echo hi");
    await new Promise((resolve) => setTimeout(resolve, 20));
    running.kill();
    const result = await running.result;
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBeNull();
    expect(result.stderr).toContain("killed before the sandbox process started");
  }, 3_000);

  test("a spawn resolving after the timeout still gets its process killed", async () => {
    let killed = false;
    const lateProc: SandboxProcessLike = {
      stdout: new ReadableStream<Uint8Array>(),
      stderr: new ReadableStream<Uint8Array>(),
      wait: () => new Promise<{ exitCode: number }>(() => undefined),
      kill: async () => {
        killed = true;
      },
    };
    const late = {
      ...createFakeSandboxSession(root),
      spawn: () =>
        new Promise<SandboxProcessLike>((resolve) => setTimeout(() => resolve(lateProc), 150)),
    };
    const runner = makeRunner({ session: late });
    const result = await runner.runCommand("echo hi", { timeoutMs: 50 });
    expect(result.timedOut).toBe(true);
    // The connect continuation kills the leaked process once spawn resolves.
    const deadline = Date.now() + 2_000;
    while (!killed && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(killed).toBe(true);
  }, 5_000);

  test("a cancelled stream bridge tolerates late end/data instead of throwing", async () => {
    // The exact Linux CI failure mode: the drain grace cancels the reader,
    // then the SIGKILLed child's node stream emits its 'end' late. With an
    // unguarded bridge that calls controller.close() on the cancelled
    // controller, bun reports "Unhandled error between tests" and fails the
    // run with zero test failures.
    const pt = new PassThrough();
    const reader = toWebStream(pt).getReader();
    await reader.cancel();
    pt.write("late-data");
    pt.end();
    // A throw would surface as an unhandled error after this tick settles.
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  test("over-budget output truncates head+tail and spills the complete text into the sandbox", async () => {
    const spillDir = join(root, ".agent", "tool-outputs");
    const runner = makeRunner({ spillDir });
    // 60k chars of numbered lines: over the 25k+25k default budget.
    const result = await runner.runCommand("i=0; while [ $i -lt 6000 ]; do printf '%09d\\n' $i; i=$((i+1)); done");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("output truncated");
    // The marker names a root-relative path readable via the sandbox read tool.
    expect(result.stdout).toContain(".agent/tool-outputs/bash-");
    const match = result.stdout.match(/\.agent\/tool-outputs\/(bash-[^\]\s]+-stdout\.log)/);
    if (!match) throw new Error("expected a spill path in the marker");
    const spilled = readFileSync(join(spillDir, match[1] ?? ""), "utf8");
    expect(spilled.length).toBe(60_000);
    expect(spilled.startsWith("000000000\n")).toBe(true);
    expect(spilled.endsWith("000005999\n")).toBe(true);
    // The bounded text keeps the real head and tail around the marker.
    expect(result.stdout.startsWith("000000000\n")).toBe(true);
    expect(result.stdout.endsWith("000005999\n")).toBe(true);
  }, 15_000);

  test("without a spillDir the truncation marker carries no file pointer", async () => {
    const runner = makeRunner();
    const result = await runner.runCommand("i=0; while [ $i -lt 6000 ]; do printf '%09d\\n' $i; i=$((i+1)); done");
    expect(result.stdout).toContain("output truncated");
    expect(result.stdout).not.toContain("full output");
  }, 15_000);

  test("a session without spawn() fails as a normal result, not an unhandled throw", async () => {
    const bare: SandboxSessionLike = {
      readBinaryFile: async () => null,
      writeBinaryFile: async () => undefined,
      run: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
    };
    const runner = makeRunner({ session: bare });
    const result = await runner.runCommand("echo hi");
    expect(result.exitCode).toBeNull();
    expect(result.stderr).toContain("does not support spawn()");
  });

  test("a spawn failure surfaces its message on stderr with exitCode null", async () => {
    const failing = {
      ...createFakeSandboxSession(root),
      spawn: async () => {
        throw new Error("SSH transport dropped");
      },
    };
    const runner = makeRunner({ session: failing });
    const result = await runner.runCommand("echo hi");
    expect(result.exitCode).toBeNull();
    expect(result.stderr).toContain("SSH transport dropped");
    expect(result.timedOut).toBe(false);
  });
});

describe("sandboxRunnerProvider", () => {
  test("resolves the session through the injected resolver, per call", async () => {
    let resolves = 0;
    const provider = sandboxRunnerProvider({
      root,
      resolveSession: async () => {
        resolves += 1;
        return createFakeSandboxSession(root);
      },
    });
    const runner = provider(undefined);
    const result = await runner.runCommand("echo via-provider");
    expect(result.stdout).toBe("via-provider\n");
    // Lazy + memoized per runner: two commands on one runner share a session.
    await runner.runCommand("true");
    expect(resolves).toBe(1);
  });

  test("the default resolver requires a tool context and names the gap", async () => {
    const provider = sandboxRunnerProvider({ root });
    const runner = provider(undefined);
    const result = await runner.runCommand("echo hi");
    expect(result.exitCode).toBeNull();
    expect(result.stderr).toContain("eve tool context");
  });

  test("the default resolver uses ctx.getSandbox", async () => {
    const ctx: IoToolContext = {
      getSandbox: async () => createFakeSandboxSession(root),
    };
    const provider = sandboxRunnerProvider({ root });
    const runner = provider(ctx);
    const result = await runner.runCommand("echo from-ctx");
    expect(result.stdout).toBe("from-ctx\n");
  });
});
