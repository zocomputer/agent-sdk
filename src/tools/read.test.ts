import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "eve/tools";
import { createDirConventionsTracker } from "../dir-conventions";
import { createLocalIo, type WorkspaceIO, type WorkspaceIoProvider } from "../workspace-io";
import { createWorkspace } from "../workspace";
import { createReadTool } from "./read";

// The broad read behavior (formats, attachments, riders, both IO backends)
// lives in ../index.test.ts and ../workspace-io-conformance.test.ts; this
// file covers the failure seams that need a fault-injecting IO.

const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-read-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));

mkdirSync(join(root, "docs"), { recursive: true });
writeFileSync(join(root, "docs/AGENTS.md"), "# docs conventions\n");
writeFileSync(join(root, "docs/guide.md"), "welcome\n");

const workspace = createWorkspace(root);

/** Local IO whose reads of `AGENTS.md` paths fail while `broken` is true. */
function flakyRiderIo(broken: () => boolean): WorkspaceIoProvider {
  const local = createLocalIo(root);
  const io: WorkspaceIO = {
    ...local,
    readFile(abs) {
      if (broken() && abs.endsWith("AGENTS.md")) {
        return Promise.reject(new Error("transient sandbox error"));
      }
      return local.readFile(abs);
    },
  };
  return () => io;
}

describe("read riders under a failing IO", () => {
  test("a failing rider load never fails the read, and delivery retries later", async () => {
    let broken = true;
    const read = createReadTool({
      workspace,
      noun: "repo",
      io: flakyRiderIo(() => broken),
      dirConventions: {
        tracker: createDirConventionsTracker({ workspaceRoot: root }),
        fileName: "AGENTS.md",
      },
    });
    // Rider hop broken: the primary read still succeeds, just without riders.
    const first = await read.execute({ path: "docs/guide.md" }, sessionCtx("s-flaky"));
    expect("content" in first && first.content).toContain("welcome");
    expect("directory_conventions" in first).toBe(false);

    // Rider hop recovers: the slot was not consumed, so delivery happens now.
    broken = false;
    const second = await read.execute({ path: "docs/guide.md" }, sessionCtx("s-flaky"));
    expect("directory_conventions" in second).toBe(true);
  });
});

/** A stub ToolContext whose capabilities all throw (read touches only `session.id`). */
function sessionCtx(id: string): ToolContext {
  return {
    session: {
      id,
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
}
