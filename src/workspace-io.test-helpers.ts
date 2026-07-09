import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Readable } from "node:stream";
import type { SandboxExecSessionLike, SandboxProcessLike } from "./sandbox-run";

// Test-only (excluded from the npm tarball): a SandboxExecSessionLike that
// executes against a local directory — reads/writes via node:fs, `run` via a
// real /bin/sh, `spawn` via a real child process with web-stream stdout/stderr.
// The conformance suite drives the sandbox IO through it, so the remote
// command paths (stat, git ls-files, find, rg/grep) actually run, and the
// sandbox runner tests exercise the real pump/settle machinery.

/** Commands `run`/`spawn` executed, for assertions. */
export interface FakeSessionLog {
  commands: string[];
}

// Bridge a node Readable to the web ReadableStream<Uint8Array> shape eve's
// sandbox process exposes, without a Readable.toWeb `as`-cast. Cancellation-
// safe: the runner's post-exit drain cancels readers whose streams never
// close, and a SIGKILLed child's pipes can emit their 'end' *after* that
// cancel — touching the controller then throws "Controller is already
// closed" as an unhandled error, so every event is gated on `done`.
// Exported for the regression test in sandbox-run.test.ts.
export function toWebStream(readable: Readable): ReadableStream<Uint8Array> {
  let done = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      readable.on("data", (chunk: Buffer) => {
        if (done) return;
        controller.enqueue(new Uint8Array(chunk));
      });
      readable.on("end", () => {
        if (done) return;
        done = true;
        controller.close();
      });
      readable.on("error", (err: Error) => {
        if (done) return;
        done = true;
        controller.error(err);
      });
    },
    cancel() {
      done = true;
      readable.destroy();
    },
  });
}

export function createFakeSandboxSession(
  root: string,
  log?: FakeSessionLog,
): SandboxExecSessionLike {
  return {
    async readBinaryFile({ path }) {
      try {
        return readFileSync(path);
      } catch (err) {
        if (isCode(err, "ENOENT")) return null;
        throw err;
      }
    },
    async writeBinaryFile({ path, content }) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    },
    async run({ command, workingDirectory }) {
      log?.commands.push(command);
      const res = spawnSync("/bin/sh", ["-c", command], {
        cwd: workingDirectory ?? root,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
      return {
        exitCode: res.status ?? 1,
        stdout: res.stdout ?? "",
        stderr: res.stderr ?? "",
      };
    },
    async spawn({ command, workingDirectory }): Promise<SandboxProcessLike> {
      log?.commands.push(command);
      const child = spawn("/bin/sh", ["-c", command], {
        cwd: workingDirectory ?? root,
        stdio: ["ignore", "pipe", "pipe"],
      });
      // 'exit', not 'close': 'close' additionally waits for the stdio pipes,
      // which a SIGKILLed child's runtime can leave open indefinitely
      // (observed under Bun on Linux). Attached eagerly so a pre-wait() exit
      // is never missed.
      const exited = new Promise<number>((resolve) => {
        child.on("exit", (code) => resolve(code ?? 1));
        child.on("error", () => resolve(1));
      });
      return {
        stdout: toWebStream(child.stdout),
        stderr: toWebStream(child.stderr),
        async wait() {
          return { exitCode: await exited };
        },
        async kill() {
          child.kill("SIGKILL");
        },
      };
    },
  };
}

function isCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === code
  );
}
