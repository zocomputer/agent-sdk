// The steer inbox: a per-session NDJSON file under a caller-owned dir. Writers
// (a cockpit API route, a TUI) append one line per steered message; the tool
// wrapper (./steer-tool.ts) and the park-delivery hook (./hooks.ts) drain it.
// Drain is race-safe against concurrent appends: rename the live file to a
// temp name first, so an append that races the drain recreates the live file
// and nothing is lost — it just waits for the next drain.

import {
  appendFileSync,
  linkSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { parseSteerLine, serializeSteerLine, type SteerMessage } from "./steer";

/** Options for creating a steer inbox that manages steered messages per session. */
export interface SteerInboxOptions {
  /** Directory holding the per-session inbox files (created on first append). */
  dir: string;
  /** Injectable clock for tests; defaults to `Date.now`. */
  now?: () => number;
  /** Injectable id source for tests; defaults to `crypto.randomUUID`. */
  newId?: () => string;
  /** Injectable file reader for tests (drain's failure path); defaults to `readFileSync`. */
  readFile?: (path: string) => string;
}

/** A per-session NDJSON file queue for steered messages, with race-safe drain. */
export interface SteerInbox {
  /** Queue a new steered message for a session; returns the stored message. */
  append(sessionId: string, text: string): SteerMessage;
  /** Re-queue an existing message (failed delivery), keeping its id and time. */
  appendMessage(sessionId: string, message: SteerMessage): void;
  /** Take every queued message for a session; `[]` when none are queued. */
  drain(sessionId: string): SteerMessage[];
}

// Process-wide so two inbox instances over one dir can't collide on temp names.
let drainSequence = 0;

/** Build a steer inbox over a directory holding per-session NDJSON files. */
export function createSteerInbox(options: SteerInboxOptions): SteerInbox {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const readFile = options.readFile ?? ((path: string) => readFileSync(path, "utf8"));

  // Session ids are opaque; encode so they can't traverse or collide as paths.
  const fileFor = (sessionId: string) =>
    join(options.dir, `${encodeURIComponent(sessionId)}.ndjson`);

  function appendMessage(sessionId: string, message: SteerMessage): void {
    mkdirSync(options.dir, { recursive: true });
    appendFileSync(fileFor(sessionId), `${serializeSteerLine(message)}\n`, "utf8");
  }

  return {
    append(sessionId, text) {
      const message: SteerMessage = { id: newId(), text, at: now() };
      appendMessage(sessionId, message);
      return message;
    },
    appendMessage,
    drain(sessionId) {
      const file = fileFor(sessionId);
      const claimed = `${file}.drain-${process.pid}-${drainSequence++}`;
      try {
        renameSync(file, claimed);
      } catch {
        // Nothing queued (ENOENT) — or another drainer claimed it first.
        return [];
      }
      let raw: string;
      try {
        raw = readFile(claimed);
      } catch {
        // The claim succeeded but the read failed (transient I/O). Put the
        // claimed lines back under the live name so they survive for the next
        // drain — deleting them here would drop user messages on the floor.
        // linkSync (not renameSync) because rename clobbers: a racing append
        // may have recreated the live file, and link atomically refuses
        // (EEXIST) instead of overwriting the racer's messages.
        try {
          linkSync(claimed, file);
          rmSync(claimed, { force: true });
        } catch {
          // Live file exists again — splice our lines in via append (the
          // retry read may succeed where the first didn't).
          try {
            appendFileSync(file, readFileSync(claimed));
            rmSync(claimed, { force: true });
          } catch {
            // Leave the claimed file on disk as a last resort — an orphaned
            // temp file beats silently dropped user messages.
          }
        }
        return [];
      }
      rmSync(claimed, { force: true });
      return raw
        .split("\n")
        .map(parseSteerLine)
        .filter((message): message is SteerMessage => message !== null);
    },
  };
}
