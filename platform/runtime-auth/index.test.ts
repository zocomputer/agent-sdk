import { describe, expect, test } from "bun:test";
import {
  BUILDER_AGENT_IDENTITY,
  ZO_PLATFORM_ORG,
  mintAgentToken,
  mintBuildBindTicket,
  resolveAgentContext,
  verifyAgentToken,
  verifyBuildBindTicket,
} from "./index";

const SECRET = "test-secret-please-do-not-use-in-prod";
const OTHER_SECRET = "a-different-secret";

// A fixed clock so expiry tests are deterministic (seconds since epoch).
const T0 = 1_700_000_000;
const at = (t: number) => () => t;

const agentClaims = {
  agentProjectId: "agt_abc",
  ownerOrgId: "org_owner",
  deploymentId: "dep_1",
};

describe("agent token", () => {
  test("round-trips its claims", async () => {
    const token = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 3600,
      clock: at(T0),
    });
    expect(await verifyAgentToken(token, SECRET, at(T0 + 10))).toEqual(agentClaims);
  });

  test("omits deploymentId when not provided", async () => {
    const token = await mintAgentToken({
      claims: { agentProjectId: "agt_x", ownerOrgId: "org_x" },
      secret: SECRET,
      ttlSeconds: 3600,
      clock: at(T0),
    });
    const verified = await verifyAgentToken(token, SECRET, at(T0));
    expect(verified).toEqual({ agentProjectId: "agt_x", ownerOrgId: "org_x" });
    expect(verified?.deploymentId).toBeUndefined();
  });

  test("rejects a wrong secret", async () => {
    const token = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 3600,
      clock: at(T0),
    });
    expect(await verifyAgentToken(token, OTHER_SECRET, at(T0))).toBeNull();
  });

  test("rejects an expired token", async () => {
    const token = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 60,
      clock: at(T0),
    });
    expect(await verifyAgentToken(token, SECRET, at(T0 + 120))).toBeNull();
  });

  test("rejects a garbage token", async () => {
    expect(await verifyAgentToken("not.a.jwt", SECRET, at(T0))).toBeNull();
  });
});

describe("resolveAgentContext", () => {
  test("resolves a valid agent token into an agent actor", async () => {
    const token = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 3600,
      clock: at(T0),
    });
    expect(await resolveAgentContext(token, SECRET, undefined, at(T0))).toEqual({
      actor: { kind: "agent", agentProjectId: "agt_abc", ownerOrgId: "org_owner", deploymentId: "dep_1" },
    });
  });

  test("carries the eve session id the runtime reports", async () => {
    const token = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 3600,
      clock: at(T0),
    });
    expect(await resolveAgentContext(token, SECRET, "ses-abc", at(T0))).toEqual({
      actor: { kind: "agent", agentProjectId: "agt_abc", ownerOrgId: "org_owner", deploymentId: "dep_1" },
      eveSessionId: "ses-abc",
    });
  });

  test("omits eveSessionId when none is reported", async () => {
    const token = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 3600,
      clock: at(T0),
    });
    const ctx = await resolveAgentContext(token, SECRET, undefined, at(T0));
    expect(ctx?.eveSessionId).toBeUndefined();
  });

  test("returns null for an invalid token (even with a session id)", async () => {
    expect(await resolveAgentContext("garbage", SECRET, "ses-abc", at(T0))).toBeNull();
  });
});

describe("Builder identity (launcher mint → API verify)", () => {
  test("a token minted for the Builder resolves to the Builder agent on the platform org", async () => {
    // The launcher mints exactly this; apps/api verifies with the same secret.
    const token = await mintAgentToken({
      claims: BUILDER_AGENT_IDENTITY,
      secret: SECRET,
      ttlSeconds: 3600,
      clock: at(T0),
    });
    const ctx = await resolveAgentContext(token, SECRET, "ses-builder", at(T0));
    expect(ctx).toEqual({
      actor: {
        kind: "agent",
        agentProjectId: "agt_builder",
        ownerOrgId: ZO_PLATFORM_ORG.id,
      },
      eveSessionId: "ses-builder",
    });
  });
});

describe("build-bind ticket", () => {
  const bindClaims = { userId: "usr_1", agentProjectId: "agt_1" };

  test("round-trips its claims", async () => {
    const ticket = await mintBuildBindTicket({
      claims: bindClaims,
      secret: SECRET,
      ttlSeconds: 900,
      clock: at(T0),
    });
    expect(await verifyBuildBindTicket(ticket, SECRET, at(T0 + 10))).toEqual(bindClaims);
  });

  test("rejects the wrong secret", async () => {
    const ticket = await mintBuildBindTicket({
      claims: bindClaims,
      secret: SECRET,
      ttlSeconds: 900,
      clock: at(T0),
    });
    expect(await verifyBuildBindTicket(ticket, OTHER_SECRET, at(T0))).toBeNull();
  });

  test("rejects an expired ticket", async () => {
    const ticket = await mintBuildBindTicket({
      claims: bindClaims,
      secret: SECRET,
      ttlSeconds: 900,
      clock: at(T0),
    });
    expect(await verifyBuildBindTicket(ticket, SECRET, at(T0 + 1000))).toBeNull();
  });

  test("rejects an agent token presented as a bind ticket (typ confusion)", async () => {
    const agentToken = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 900,
      clock: at(T0),
    });
    expect(await verifyBuildBindTicket(agentToken, SECRET, at(T0))).toBeNull();
  });

  test("a bind ticket is not accepted as an agent token (reverse typ confusion)", async () => {
    const ticket = await mintBuildBindTicket({
      claims: bindClaims,
      secret: SECRET,
      ttlSeconds: 900,
      clock: at(T0),
    });
    expect(await verifyAgentToken(ticket, SECRET, at(T0))).toBeNull();
  });
});
