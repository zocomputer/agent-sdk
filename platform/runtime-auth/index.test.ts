import { describe, expect, test } from "bun:test";
import {
  BUILDER_AGENT_IDENTITY,
  ZO_PLATFORM_ORG,
  formatInitiator,
  isHostedTurnLeaseId,
  mintAgentToken,
  mintIdentityBearer,
  mintSessionCapability,
  parseInitiator,
  resolveAgentContext,
  verifyAgentToken,
  verifyIdentityBearer,
  inspectSessionCapability,
  verifySessionCapability,
} from "./index";

const SECRET = "test-secret-please-do-not-use-in-prod";
const OTHER_SECRET = "a-different-secret";

// A fixed clock so expiry tests are deterministic (seconds since epoch).
const T0 = 1_700_000_000;
const at = (t: number) => () => t;

test("hosted turn leases are nonblank bounded header values", () => {
  expect(isHostedTurnLeaseId("lease-1")).toBe(true);
  for (const value of [null, "", "has whitespace", "x".repeat(129)]) {
    expect(isHostedTurnLeaseId(value)).toBe(false);
  }
});

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
    expect(await resolveAgentContext(token, SECRET, undefined, undefined, at(T0))).toEqual({
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
    expect(await resolveAgentContext(token, SECRET, "ses-abc", undefined, at(T0))).toEqual({
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
    const ctx = await resolveAgentContext(token, SECRET, undefined, undefined, at(T0));
    expect(ctx?.eveSessionId).toBeUndefined();
  });

  test("returns null for an invalid token (even with a session id)", async () => {
    expect(await resolveAgentContext("garbage", SECRET, "ses-abc", undefined, at(T0))).toBeNull();
  });

  test("accepts a capability bound to the token and, when present, its session", async () => {
    const token = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 3600,
      clock: at(T0),
    });
    const capability = await mintSessionCapability({
      claims: {
        userId: "usr_1",
        agentProjectId: agentClaims.agentProjectId,
        deploymentId: agentClaims.deploymentId,
        eveSessionId: "ses-abc",
      },
      secret: SECRET,
      ttlSeconds: 600,
      clock: at(T0),
    });

    await expect(
      resolveAgentContext(token, SECRET, "ses-abc", capability, at(T0 + 1)),
    ).resolves.toMatchObject({
      eveSessionId: "ses-abc",
      trustedSession: {
        binding: "exact",
        eveSessionId: "ses-abc",
        userId: "usr_1",
      },
    });
    await expect(
      resolveAgentContext(token, SECRET, "ses-other", capability, at(T0 + 1)),
    ).resolves.toBeNull();

    const bootstrap = await mintSessionCapability({
      claims: {
        userId: "usr_1",
        agentProjectId: agentClaims.agentProjectId,
        deploymentId: agentClaims.deploymentId,
      },
      secret: SECRET,
      ttlSeconds: 600,
      clock: at(T0),
    });
    await expect(
      resolveAgentContext(token, SECRET, "ses-created", bootstrap, at(T0 + 1)),
    ).resolves.toMatchObject({
      trustedSession: {
        binding: "bootstrap",
        // Deliberately NOT `eveSessionId`: the runtime asserted this id, so the
        // type names it unverified until the Conversation ownership join vouches.
        unverifiedEveSessionId: "ses-created",
        userId: "usr_1",
      },
    });
    await expect(
      resolveAgentContext(token, SECRET, undefined, bootstrap, at(T0 + 1)),
    ).resolves.toBeNull();
  });

  test("an expired capability degrades to no trustedSession instead of rejecting the request", async () => {
    // Eve latches the bootstrap proof in durable session auth, so a scheduled or
    // late turn on an old conversation replays it past its TTL. That turn's
    // session-partitioned state never needed per-user identity — the request must
    // still resolve; only `trustedSession` is withheld (per-user state fails closed).
    const token = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 3600,
      clock: at(T0 + 700),
    });
    const capability = await mintSessionCapability({
      claims: {
        userId: "usr_1",
        agentProjectId: agentClaims.agentProjectId,
        deploymentId: agentClaims.deploymentId,
        eveSessionId: "ses-abc",
      },
      secret: SECRET,
      ttlSeconds: 600,
      clock: at(T0),
    });

    const ctx = await resolveAgentContext(token, SECRET, "ses-abc", capability, at(T0 + 700));
    expect(ctx).toEqual({
      actor: { kind: "agent", agentProjectId: "agt_abc", ownerOrgId: "org_owner", deploymentId: "dep_1" },
      eveSessionId: "ses-abc",
    });
    expect(ctx?.trustedSession).toBeUndefined();
  });

  test("a forged or malformed capability still hard-rejects the request", async () => {
    const token = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 3600,
      clock: at(T0),
    });
    const forged = await mintSessionCapability({
      claims: {
        userId: "usr_evil",
        agentProjectId: agentClaims.agentProjectId,
        deploymentId: agentClaims.deploymentId,
        eveSessionId: "ses-abc",
      },
      secret: "some-other-secret",
      ttlSeconds: 600,
      clock: at(T0),
    });

    await expect(
      resolveAgentContext(token, SECRET, "ses-abc", forged, at(T0 + 1)),
    ).resolves.toBeNull();
    await expect(
      resolveAgentContext(token, SECRET, "ses-abc", "not.a.jwt", at(T0 + 1)),
    ).resolves.toBeNull();
  });

  test("an EXPIRED forged capability also hard-rejects — expiry never launders a bad signature", async () => {
    const token = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 3600,
      clock: at(T0 + 700),
    });
    const forgedStale = await mintSessionCapability({
      claims: {
        userId: "usr_evil",
        agentProjectId: agentClaims.agentProjectId,
        deploymentId: agentClaims.deploymentId,
        eveSessionId: "ses-abc",
      },
      secret: "some-other-secret",
      ttlSeconds: 600,
      clock: at(T0),
    });

    await expect(
      resolveAgentContext(token, SECRET, "ses-abc", forgedStale, at(T0 + 700)),
    ).resolves.toBeNull();
  });
});

describe("inspectSessionCapability", () => {
  const claims = {
    userId: "usr_1",
    agentProjectId: "agt_abc",
    deploymentId: "dep_1",
    eveSessionId: "ses-abc",
  };

  test("grades verified, expired, and invalid distinctly", async () => {
    const token = await mintSessionCapability({
      claims,
      secret: SECRET,
      ttlSeconds: 60,
      clock: at(T0),
    });

    await expect(inspectSessionCapability(token, SECRET, at(T0 + 1))).resolves.toEqual({
      outcome: "verified",
      claims,
    });
    await expect(inspectSessionCapability(token, SECRET, at(T0 + 61))).resolves.toEqual({
      outcome: "expired",
    });
    await expect(inspectSessionCapability(token, "wrong-secret", at(T0 + 1))).resolves.toEqual({
      outcome: "invalid",
    });
    await expect(inspectSessionCapability("garbage", SECRET, at(T0 + 1))).resolves.toEqual({
      outcome: "invalid",
    });
  });

  test("a wrong-typ token is invalid, not expired, even when in date", async () => {
    const agentTok = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 60,
      clock: at(T0),
    });
    await expect(inspectSessionCapability(agentTok, SECRET, at(T0 + 1))).resolves.toEqual({
      outcome: "invalid",
    });
  });
});

describe("session capability", () => {
  test("round-trips and rejects expiry", async () => {
    const claims = {
      userId: "usr_1",
      agentProjectId: "agt_abc",
      deploymentId: "dep_1",
      eveSessionId: "ses-abc",
    };
    const token = await mintSessionCapability({
      claims,
      secret: SECRET,
      ttlSeconds: 60,
      clock: at(T0),
    });
    expect(await verifySessionCapability(token, SECRET, at(T0 + 1))).toEqual(claims);
    expect(await verifySessionCapability(token, SECRET, at(T0 + 61))).toBeNull();
    expect(await verifyAgentToken(token, SECRET, at(T0 + 1))).toBeNull();
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
    const ctx = await resolveAgentContext(token, SECRET, "ses-builder", undefined, at(T0));
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

describe("identity bearer", () => {
  const identityClaims = { userId: "usr_1", agentId: "agt_1" };

  test("round-trips its claims", async () => {
    const bearer = await mintIdentityBearer({
      claims: identityClaims,
      secret: SECRET,
      ttlSeconds: 900,
      clock: at(T0),
    });
    expect(await verifyIdentityBearer(bearer, SECRET, at(T0 + 10))).toEqual(identityClaims);
  });

  test("rejects the wrong secret", async () => {
    const bearer = await mintIdentityBearer({
      claims: identityClaims,
      secret: SECRET,
      ttlSeconds: 900,
      clock: at(T0),
    });
    expect(await verifyIdentityBearer(bearer, OTHER_SECRET, at(T0))).toBeNull();
  });

  test("rejects an expired bearer", async () => {
    const bearer = await mintIdentityBearer({
      claims: identityClaims,
      secret: SECRET,
      ttlSeconds: 900,
      clock: at(T0),
    });
    expect(await verifyIdentityBearer(bearer, SECRET, at(T0 + 1000))).toBeNull();
  });

  test("rejects an agent token presented as an identity bearer (typ confusion)", async () => {
    const agentToken = await mintAgentToken({
      claims: agentClaims,
      secret: SECRET,
      ttlSeconds: 900,
      clock: at(T0),
    });
    expect(await verifyIdentityBearer(agentToken, SECRET, at(T0))).toBeNull();
  });

  test("an identity bearer is not accepted as an agent token (reverse typ confusion)", async () => {
    const bearer = await mintIdentityBearer({
      claims: identityClaims,
      secret: SECRET,
      ttlSeconds: 900,
      clock: at(T0),
    });
    expect(await verifyAgentToken(bearer, SECRET, at(T0))).toBeNull();
  });
});

describe("initiator header (format/parse)", () => {
  const identity = { userId: "usr_1", agentId: "agt_1" };

  test("round-trips through format → parse", () => {
    expect(parseInitiator(formatInitiator(identity))).toEqual(identity);
  });

  test("returns null for absent value", () => {
    expect(parseInitiator(null)).toBeNull();
    expect(parseInitiator(undefined)).toBeNull();
    expect(parseInitiator("")).toBeNull();
  });

  test("returns null for malformed JSON", () => {
    expect(parseInitiator("not-json")).toBeNull();
  });

  test("returns null when a field is missing", () => {
    expect(parseInitiator(JSON.stringify({ userId: "usr_1" }))).toBeNull();
    expect(parseInitiator(JSON.stringify({ agentId: "agt_1" }))).toBeNull();
  });

  test("returns null when a field is the wrong type", () => {
    expect(parseInitiator(JSON.stringify({ userId: "usr_1", agentId: 5 }))).toBeNull();
    expect(parseInitiator(JSON.stringify({ userId: "", agentId: "agt_1" }))).toBeNull();
  });

  test("returns null for a non-object body", () => {
    expect(parseInitiator(JSON.stringify("string"))).toBeNull();
    expect(parseInitiator(JSON.stringify(["a"]))).toBeNull();
  });
});
