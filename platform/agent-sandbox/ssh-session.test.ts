import { EventEmitter } from "node:events";
import { Buffer } from "node:buffer";
import { describe, expect, test } from "bun:test";
import type { Client } from "ssh2";
import type { Connector } from "./ssh-connection";
import { sshSandboxSession } from "./ssh-session";

// The connection lifecycle is unit-tested directly on SshConnectionManager
// (ssh-connection.test.ts). Here we just check the session delegates to it: a
// disposed session refuses to run without provisioning, and the sandbox id is
// surfaced through. (Anything needing a live SSH socket is covered by the live
// probes, not unit tests.)
//
// The file-method tests below ride the injectable connector seam with a fake
// ssh2 Client (sftp + exec only — the surface sftp.ts touches), so the
// /workspace→work-dir remapping is asserted at the layer eve actually calls,
// not just on the pure helper.

/** A fake exec channel: emits a clean exit after the callback wires listeners. */
class FakeExecChannel extends EventEmitter {
  readonly stderr = new EventEmitter();
  close(): void {}
}

/**
 * A fake ssh2 `Client` covering exactly what the session's file methods reach:
 * `sftp()` (readFile/writeFile) and `exec()` (mkdir -p / rm). Records the paths
 * and commands it saw. The double-assertion to `Client` is the same test escape
 * hatch spawn.test.ts uses for its fake channel — building a real `Client` is
 * impractical.
 */
function fakeFileClient(files: Record<string, Uint8Array>): {
  client: Client;
  reads: string[];
  writes: string[];
  execs: string[];
} {
  const reads: string[] = [];
  const writes: string[] = [];
  const execs: string[] = [];
  const sftp = {
    on() {
      return this;
    },
    readFile(p: string, cb: (err: Error | null, buf?: Buffer) => void) {
      reads.push(p);
      const bytes = files[p];
      if (bytes === undefined) {
        // Shape ssh2 uses for a missing file: an error with the SFTP status code.
        cb(Object.assign(new Error("No such file"), { code: 2 }));
        return;
      }
      cb(null, Buffer.from(bytes));
    },
    writeFile(p: string, _data: Buffer, cb: (err: Error | null) => void) {
      writes.push(p);
      cb(null);
    },
  };
  const raw = {
    sftp(cb: (err: Error | undefined, s: typeof sftp) => void) {
      cb(undefined, sftp);
    },
    exec(command: string, cb: (err: Error | undefined, ch: FakeExecChannel) => void) {
      execs.push(command);
      const ch = new FakeExecChannel();
      cb(undefined, ch);
      queueMicrotask(() => {
        ch.emit("exit", 0);
        ch.emit("close");
      });
    },
  };
  return { client: raw as unknown as Client, reads, writes, execs };
}

/** A connector that hands the manager the fake client (no socket, token far from expiry). */
function fakeConnector(client: Client): Connector<Client> {
  return () =>
    Promise.resolve({
      client,
      end: () => {},
      onClose: () => {},
    });
}

const fakeAccess = () =>
  Promise.resolve({
    sandboxId: "sbx_fake",
    sshHost: "fake.host",
    sshUser: "token",
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  });

describe("sshSandboxSession", () => {
  test("run() after dispose() rejects without provisioning", async () => {
    let acquireCalls = 0;
    const ssh = sshSandboxSession("ses-1", async () => {
      acquireCalls += 1;
      throw new Error("acquireAccess should not run on a disposed session");
    });

    ssh.dispose();

    await expect(ssh.session.run({ command: "echo hi" })).rejects.toThrow(/disposed/);
    expect(acquireCalls).toBe(0);
  });

  test("currentSandboxId is null before any run", () => {
    const ssh = sshSandboxSession("ses-1", async () => {
      throw new Error("not called");
    });
    expect(ssh.currentSandboxId()).toBeNull();
  });

  test("resolvePath remaps eve's nominal /workspace root onto the work dir", () => {
    const ssh = sshSandboxSession("ses-1", async () => {
      throw new Error("not called");
    });
    expect(ssh.session.resolvePath("/workspace/skills/demo/SKILL.md")).toBe(
      "/home/daytona/skills/demo/SKILL.md",
    );
    expect(ssh.session.resolvePath("/workspace")).toBe("/home/daytona");
    // Non-matching absolutes and relatives keep their existing behavior.
    expect(ssh.session.resolvePath("/workspaces/x")).toBe("/workspaces/x");
    expect(ssh.session.resolvePath("skills/demo")).toBe("/home/daytona/skills/demo");
  });

  test("readTextFile on a /workspace path reads the remapped work-dir path (load_skill shape)", async () => {
    const { client, reads } = fakeFileClient({
      "/home/daytona/skills/demo/SKILL.md": new TextEncoder().encode("# demo skill"),
    });
    const ssh = sshSandboxSession("ses-1", fakeAccess, fakeConnector(client));

    const text = await ssh.session.readTextFile({ path: "/workspace/skills/demo/SKILL.md" });

    expect(text).toBe("# demo skill");
    expect(reads).toEqual(["/home/daytona/skills/demo/SKILL.md"]);
  });

  test("writeTextFile on a /workspace path writes the remapped path and mkdirs its remapped parent (skill materialization shape)", async () => {
    const { client, writes, execs } = fakeFileClient({});
    const ssh = sshSandboxSession("ses-1", fakeAccess, fakeConnector(client));

    await ssh.session.writeTextFile({
      path: "/workspace/skills/demo/SKILL.md",
      content: "# demo skill",
    });

    expect(writes).toEqual(["/home/daytona/skills/demo/SKILL.md"]);
    // ensureParentDir ran against the REMAPPED parent, not /workspace/….
    expect(execs).toEqual(["mkdir -p '/home/daytona/skills/demo'"]);
  });

  test("readBinaryFile does not remap a path that merely contains 'workspace'", async () => {
    const { client, reads } = fakeFileClient({
      "/home/daytona/workspace-file": new TextEncoder().encode("x"),
    });
    const ssh = sshSandboxSession("ses-1", fakeAccess, fakeConnector(client));

    const bytes = await ssh.session.readBinaryFile({ path: "/home/daytona/workspace-file" });

    expect(bytes).toEqual(new TextEncoder().encode("x"));
    expect(reads).toEqual(["/home/daytona/workspace-file"]);
  });

  test("run anchors a /workspace workingDirectory to the remapped work dir", async () => {
    const { client, execs } = fakeFileClient({});
    const ssh = sshSandboxSession("ses-1", fakeAccess, fakeConnector(client));

    await ssh.session.run({ command: "echo hi", workingDirectory: "/workspace/proj" });

    expect(execs).toEqual(["mkdir -p '/home/daytona/proj' && cd '/home/daytona/proj' && echo hi"]);
  });
});
