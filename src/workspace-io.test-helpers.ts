import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { SandboxSessionLike } from "./workspace-io";

// Test-only (excluded from the npm tarball): a SandboxSessionLike that
// executes against a local directory — reads/writes via node:fs, `run` via a
// real /bin/sh. The conformance suite drives the sandbox IO through it, so
// the remote command paths (stat, git ls-files, find, rg/grep) actually run.

/** Commands `run` executed, for assertions. */
export interface FakeSessionLog {
  commands: string[];
}

export function createFakeSandboxSession(
  root: string,
  log?: FakeSessionLog,
): SandboxSessionLike {
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
