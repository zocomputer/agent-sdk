// ../../../../../tmp/agent-sdk-mirror-LCdMNT/repo/src/steer-inbox.ts
import {
  appendFileSync,
  linkSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync
} from "node:fs";
import { join } from "node:path";

// ../../../../../tmp/agent-sdk-mirror-LCdMNT/repo/src/steer.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSteerMessage(value) {
  return isRecord(value) && typeof value.id === "string" && typeof value.text === "string" && typeof value.at === "number";
}
function serializeSteerLine(message) {
  return JSON.stringify(message);
}
function parseSteerLine(line) {
  const trimmed = line.trim();
  if (trimmed === "")
    return null;
  try {
    const parsed = JSON.parse(trimmed);
    return isSteerMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ../../../../../tmp/agent-sdk-mirror-LCdMNT/repo/src/steer-inbox.ts
var drainSequence = 0;
function createSteerInbox(options) {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const readFile = options.readFile ?? ((path) => readFileSync(path, "utf8"));
  const fileFor = (sessionId) => join(options.dir, `${encodeURIComponent(sessionId)}.ndjson`);
  function appendMessage(sessionId, message) {
    mkdirSync(options.dir, { recursive: true });
    appendFileSync(fileFor(sessionId), `${serializeSteerLine(message)}
`, "utf8");
  }
  return {
    append(sessionId, text) {
      const message = { id: newId(), text, at: now() };
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
        return [];
      }
      let raw;
      try {
        raw = readFile(claimed);
      } catch {
        try {
          linkSync(claimed, file);
          rmSync(claimed, { force: true });
        } catch {
          try {
            appendFileSync(file, readFileSync(claimed));
            rmSync(claimed, { force: true });
          } catch {}
        }
        return [];
      }
      rmSync(claimed, { force: true });
      return raw.split(`
`).map(parseSteerLine).filter((message) => message !== null);
    }
  };
}
export {
  createSteerInbox
};
