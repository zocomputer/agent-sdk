import { afterAll, expect, test } from "bun:test";
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSteerInbox, type SteerInboxOptions } from "./steer-inbox";

const root = mkdtempSync(join(tmpdir(), "steer-inbox-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

let dirCount = 0;
function freshInbox(overrides?: Pick<SteerInboxOptions, "now" | "newId">) {
  const dir = join(root, `case-${dirCount++}`);
  return { dir, inbox: createSteerInbox({ dir, ...overrides }) };
}

test("append then drain returns messages in order and empties the inbox", () => {
  let tick = 0;
  let id = 0;
  const { inbox } = freshInbox({ now: () => ++tick, newId: () => `id-${++id}` });
  inbox.append("s1", "do the thing");
  inbox.append("s1", "then this");
  expect(inbox.drain("s1")).toEqual([
    { id: "id-1", text: "do the thing", at: 1 },
    { id: "id-2", text: "then this", at: 2 },
  ]);
  expect(inbox.drain("s1")).toEqual([]);
});

test("draining a never-steered session returns []", () => {
  const { inbox } = freshInbox();
  expect(inbox.drain("never-seen")).toEqual([]);
});

test("sessions are isolated", () => {
  const { inbox } = freshInbox();
  inbox.append("s1", "for one");
  inbox.append("s2", "for two");
  expect(inbox.drain("s1").map((m) => m.text)).toEqual(["for one"]);
  expect(inbox.drain("s2").map((m) => m.text)).toEqual(["for two"]);
});

test("malformed lines are skipped, valid ones kept", () => {
  const { dir, inbox } = freshInbox();
  inbox.append("s1", "first");
  appendFileSync(join(dir, "s1.ndjson"), "{broken\n\n", "utf8");
  inbox.append("s1", "second");
  expect(inbox.drain("s1").map((m) => m.text)).toEqual(["first", "second"]);
});

test("appendMessage re-queues with the original id and time", () => {
  const { inbox } = freshInbox();
  inbox.appendMessage("s1", { id: "keep-id", text: "redo", at: 123 });
  expect(inbox.drain("s1")).toEqual([{ id: "keep-id", text: "redo", at: 123 }]);
});

test("session ids are path-encoded so they can't traverse", () => {
  const { dir, inbox } = freshInbox();
  inbox.append("../weird/id", "escape attempt");
  expect(existsSync(join(dir, `${encodeURIComponent("../weird/id")}.ndjson`))).toBe(true);
  expect(inbox.drain("../weird/id").map((m) => m.text)).toEqual(["escape attempt"]);
});

test("drain leaves no temp files behind", () => {
  const { dir, inbox } = freshInbox();
  inbox.append("s1", "one");
  inbox.drain("s1");
  expect(readdirSync(dir)).toEqual([]);
});

test("an append after a drain lands in the next drain", () => {
  const { inbox } = freshInbox();
  inbox.append("s1", "first");
  inbox.drain("s1");
  inbox.append("s1", "second");
  expect(inbox.drain("s1").map((m) => m.text)).toEqual(["second"]);
});

test("a failed drain read restores the messages for the next drain", () => {
  const dir = join(root, `case-${dirCount++}`);
  let fail = true;
  const flaky = createSteerInbox({
    dir,
    readFile: (path) => {
      if (fail) throw new Error("EIO");
      return readFileSync(path, "utf8");
    },
  });
  flaky.append("s1", "survive me");
  expect(flaky.drain("s1")).toEqual([]); // read failed — nothing delivered…
  fail = false;
  expect(flaky.drain("s1").map((m) => m.text)).toEqual(["survive me"]); // …nothing lost
  expect(readdirSync(dir)).toEqual([]);
});

test("a failed drain read merges with a racing append instead of clobbering it", () => {
  const dir = join(root, `case-${dirCount++}`);
  const inbox = createSteerInbox({ dir });
  let fail = true;
  const flaky = createSteerInbox({
    dir,
    readFile: (path) => {
      if (fail) {
        // Simulate an append landing between the rename-claim and recovery:
        // the live file exists again when the restore runs.
        inbox.append("s1", "racer");
        throw new Error("EIO");
      }
      return readFileSync(path, "utf8");
    },
  });
  flaky.append("s1", "claimed");
  expect(flaky.drain("s1")).toEqual([]); // read failed — claimed lines splice back
  fail = false;
  expect(flaky.drain("s1").map((m) => m.text)).toEqual(["racer", "claimed"]);
  expect(readdirSync(dir)).toEqual([]);
});
