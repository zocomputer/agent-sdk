import { describe, expect, test } from "bun:test";
import {
  INITIATOR_HEADER,
  SESSION_CAPABILITY_ATTRIBUTE,
  SESSION_CAPABILITY_HEADER,
  initiatorAuth,
  parseInitiator,
  readInitiator,
  readSessionCapability,
} from "./initiator-auth";

function requestWith(headers: Record<string, string>): Request {
  return new Request("http://agent.test/eve/v1/session", { headers });
}

/** The proxy-side serialization (`@zocomputer/runtime-auth`'s formatInitiator). */
function initiatorHeader(userId: string, agentId: string): string {
  return JSON.stringify({ userId, agentId });
}

describe("initiatorAuth", () => {
  test("maps a valid x-zo-initiator header to the initiator SessionAuthContext", () => {
    const req = requestWith({ [INITIATOR_HEADER]: initiatorHeader("usr_1", "agt_1") });
    expect(initiatorAuth(req)).toEqual({
      principalId: "usr_1",
      principalType: "user",
      authenticator: "zo-initiator",
      subject: "usr_1",
      attributes: { agentId: "agt_1" },
    });
  });

  test("returns null when the header is absent (degrade to none())", () => {
    expect(initiatorAuth(requestWith({}))).toBeNull();
  });

  test("returns null for a malformed header", () => {
    expect(initiatorAuth(requestWith({ [INITIATOR_HEADER]: "not-json" }))).toBeNull();
  });

  test("stores the opaque session capability in the Eve auth context", () => {
    const req = requestWith({
      [INITIATOR_HEADER]: initiatorHeader("usr_1", "agt_1"),
      [SESSION_CAPABILITY_HEADER]: "signed-session-capability",
    });
    expect(initiatorAuth(req)).toMatchObject({
      attributes: {
        agentId: "agt_1",
        [SESSION_CAPABILITY_ATTRIBUTE]: "signed-session-capability",
      },
    });
  });
});

describe("parseInitiator", () => {
  test("mirrors the runtime-auth contract: whole identity or null", () => {
    expect(parseInitiator(initiatorHeader("usr_1", "agt_1"))).toEqual({
      userId: "usr_1",
      agentId: "agt_1",
    });
    for (const bad of [
      null,
      undefined,
      "",
      "not-json",
      "42",
      JSON.stringify({ userId: "usr_1" }),
      JSON.stringify({ agentId: "agt_1" }),
      JSON.stringify({ userId: "", agentId: "agt_1" }),
      JSON.stringify({ userId: 1, agentId: "agt_1" }),
    ]) {
      expect(parseInitiator(bad)).toBeNull();
    }
  });
});

describe("readInitiator", () => {
  test("pulls agentId from attributes and userId from subject", () => {
    expect(
      readInitiator({ subject: "usr_1", attributes: { agentId: "agt_1" } }),
    ).toEqual({ userId: "usr_1", agentId: "agt_1" });
  });

  test("returns null for an absent initiator (local dev / unscoped)", () => {
    expect(readInitiator(null)).toBeNull();
    expect(readInitiator(undefined)).toBeNull();
  });

  test("returns null when agentId is missing or non-string", () => {
    expect(readInitiator({ subject: "usr_1", attributes: {} })).toBeNull();
    expect(
      readInitiator({ subject: "usr_1", attributes: { agentId: ["agt_1"] } }),
    ).toBeNull();
  });

  test("returns null when subject (userId) is missing", () => {
    expect(readInitiator({ attributes: { agentId: "agt_1" } })).toBeNull();
  });
});

describe("readSessionCapability", () => {
  test("prefers current auth and falls back to the durable initiator", () => {
    const initiator = {
      attributes: { [SESSION_CAPABILITY_ATTRIBUTE]: "initiator-cap" },
    };
    expect(
      readSessionCapability(
        { attributes: { [SESSION_CAPABILITY_ATTRIBUTE]: "current-cap" } },
        initiator,
      ),
    ).toBe("current-cap");
    expect(readSessionCapability(null, initiator)).toBe("initiator-cap");
    expect(readSessionCapability(null, null)).toBeUndefined();
  });
});
