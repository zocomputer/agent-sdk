import { describe, expect, test } from "bun:test";
import { sshSandboxSession } from "./ssh-session";

// The connection lifecycle is unit-tested directly on SshConnectionManager
// (ssh-connection.test.ts). Here we just check the session delegates to it: a
// disposed session refuses to run without provisioning, and the sandbox id is
// surfaced through. (Anything needing a live SSH socket is covered by the live
// probes, not unit tests.)

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
});
