import { describe, expect, test } from "bun:test";
import {
  attachSteerToOutput,
  buildSteerPayload,
  formatSteerText,
  mergeSteerIntoModelOutput,
  parseSteerLine,
  readSteerMessages,
  serializeSteerLine,
  STEER_FIELD,
  STEER_NOTE,
  STEER_WRAPPED_OUTPUT_FIELD,
  stripSteerFromOutput,
  type SteerMessage,
} from "./steer";

const one: SteerMessage = { id: "m1", text: "focus on the tests", at: 1_000 };
const two: SteerMessage = { id: "m2", text: "skip the docs", at: 2_000 };

describe("attachSteerToOutput", () => {
  test("spreads into a record output, preserving its own keys", () => {
    const attached = attachSteerToOutput({ ok: true, count: 3 }, [one]);
    expect(attached.ok).toBe(true);
    expect(attached.count).toBe(3);
    expect(readSteerMessages(attached)).toEqual([one]);
  });

  test("wraps a non-record output recoverably", () => {
    const attached = attachSteerToOutput("plain text", [one]);
    expect(attached[STEER_WRAPPED_OUTPUT_FIELD]).toBe("plain text");
    expect(readSteerMessages(attached)).toEqual([one]);
  });

  test("wraps an array output recoverably (arrays aren't records)", () => {
    const attached = attachSteerToOutput([1, 2, 3], [one]);
    expect(attached[STEER_WRAPPED_OUTPUT_FIELD]).toEqual([1, 2, 3]);
    expect(readSteerMessages(attached)).toEqual([one]);
  });

  test("attaching twice merges the message lists", () => {
    const first = attachSteerToOutput({ ok: true }, [one]);
    const second = attachSteerToOutput(first, [two]);
    expect(readSteerMessages(second)).toEqual([one, two]);
  });
});

describe("stripSteerFromOutput", () => {
  test("round-trips a record output", () => {
    const attached = attachSteerToOutput({ ok: true, count: 3 }, [one]);
    expect(stripSteerFromOutput(attached)).toEqual({ ok: true, count: 3 });
  });

  test("round-trips a non-record output", () => {
    const attached = attachSteerToOutput("plain text", [one]);
    expect(stripSteerFromOutput(attached)).toBe("plain text");
  });

  test("round-trips null", () => {
    const attached = attachSteerToOutput(null, [one]);
    expect(stripSteerFromOutput(attached)).toBeNull();
  });

  test("a record legitimately containing the wrapper key plus other keys survives", () => {
    const record = {
      [STEER_WRAPPED_OUTPUT_FIELD]: "not a wrapper",
      other: 1,
      [STEER_FIELD]: buildSteerPayload([one]),
    };
    expect(stripSteerFromOutput(record)).toEqual({
      [STEER_WRAPPED_OUTPUT_FIELD]: "not a wrapper",
      other: 1,
    });
  });
});

describe("readSteerMessages", () => {
  test("null for a non-record output", () => {
    expect(readSteerMessages("text")).toBeNull();
    expect(readSteerMessages(null)).toBeNull();
    expect(readSteerMessages([one])).toBeNull();
  });

  test("null when the field is missing", () => {
    expect(readSteerMessages({ ok: true })).toBeNull();
  });

  test("null for a malformed payload", () => {
    expect(readSteerMessages({ [STEER_FIELD]: "not a payload" })).toBeNull();
    expect(readSteerMessages({ [STEER_FIELD]: { note: "n", messages: "nope" } })).toBeNull();
  });

  test("drops malformed entries, keeps valid ones", () => {
    const output = {
      [STEER_FIELD]: { note: STEER_NOTE, messages: [one, { id: 1, text: "bad" }, two] },
    };
    expect(readSteerMessages(output)).toEqual([one, two]);
  });

  test("null when every entry is malformed", () => {
    const output = { [STEER_FIELD]: { note: STEER_NOTE, messages: [{ nope: true }] } };
    expect(readSteerMessages(output)).toBeNull();
  });
});

describe("mergeSteerIntoModelOutput", () => {
  test("appends the rendered block to a text output", () => {
    const merged = mergeSteerIntoModelOutput({ type: "text", value: "tool body" }, [one]);
    if (merged.type !== "text") throw new Error("expected text output");
    expect(merged.value.startsWith("tool body")).toBe(true);
    expect(merged.value).toContain(STEER_NOTE);
    expect(merged.value).toContain(one.text);
  });

  test("re-attaches the field to a json output", () => {
    const merged = mergeSteerIntoModelOutput({ type: "json", value: { ok: true } }, [one]);
    if (merged.type !== "json") throw new Error("expected json output");
    expect(readSteerMessages(merged.value)).toEqual([one]);
  });
});

describe("formatSteerText", () => {
  test("renders the note plus one line per message", () => {
    const text = formatSteerText([one, two]);
    expect(text).toBe(`[${STEER_FIELD}] ${STEER_NOTE}\n- ${one.text}\n- ${two.text}`);
  });
});

describe("serializeSteerLine / parseSteerLine", () => {
  test("round-trips a message", () => {
    expect(parseSteerLine(serializeSteerLine(one))).toEqual(one);
  });

  test("null on blank or malformed lines", () => {
    expect(parseSteerLine("")).toBeNull();
    expect(parseSteerLine("   ")).toBeNull();
    expect(parseSteerLine("{broken")).toBeNull();
    expect(parseSteerLine('{"id":1}')).toBeNull();
  });
});

describe("buildSteerPayload", () => {
  test("carries the note and a copy of the messages", () => {
    const input = [one];
    const payload = buildSteerPayload(input);
    expect(payload.note).toBe(STEER_NOTE);
    expect(payload.messages).toEqual([one]);
    expect(payload.messages).not.toBe(input);
  });
});
