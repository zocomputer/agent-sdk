import { describe, expect, test } from "bun:test";
import {
  INITIATOR_HEADER,
  SESSION_CAPABILITY_ATTRIBUTE,
  SESSION_CAPABILITY_HEADER,
  initiatorAuth,
  isVerifiedApiCaller,
  parseApiSubjects,
  parseInitiator,
  readInitiator,
  readSessionCapability,
} from "./initiator-auth";

/** Build a JWT with the given `sub` (unsigned — the gate reads the decoded sub). */
function jwtWithSub(sub: string): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "RS256" })}.${b64({ sub })}.sig`;
}

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

describe("parseApiSubjects", () => {
  test("splits, trims, and drops blanks", () => {
    expect(parseApiSubjects(" a:b , , c:d ")).toEqual(["a:b", "c:d"]);
    expect(parseApiSubjects(undefined)).toEqual([]);
    expect(parseApiSubjects("")).toEqual([]);
  });
});

describe("isVerifiedApiCaller", () => {
  const API = "owner:substrate-labs:project:zov2-api:environment:*";

  test("matches the API subject across the wildcard environment segment", () => {
    const prod = jwtWithSub("owner:substrate-labs:project:zov2-api:environment:production");
    const preview = jwtWithSub("owner:substrate-labs:project:zov2-api:environment:preview");
    expect(isVerifiedApiCaller(prod, [API])).toBe(true);
    expect(isVerifiedApiCaller(preview, [API])).toBe(true);
  });

  test("rejects the agent's OWN project token (current-project bypass)", () => {
    const own = jwtWithSub("owner:zo-tenant-staging:project:some-agent:environment:production");
    expect(isVerifiedApiCaller(own, [API])).toBe(false);
  });

  test("the wildcard does not span the project segment", () => {
    const other = jwtWithSub("owner:substrate-labs:project:zov2-other:environment:production");
    expect(isVerifiedApiCaller(other, [API])).toBe(false);
  });

  test("a malformed token (no decodable sub) is not an API caller", () => {
    expect(isVerifiedApiCaller("not-a-jwt", [API])).toBe(false);
    expect(isVerifiedApiCaller("a.b.c", [API])).toBe(false);
  });

  test("no configured subjects → never an API caller", () => {
    expect(isVerifiedApiCaller(jwtWithSub("anything"), [])).toBe(false);
  });
});
