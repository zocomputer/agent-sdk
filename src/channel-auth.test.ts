import { describe, expect, test } from "bun:test";
import { verifiedInitiatorAuth, zoChannelAuth } from "./channel-auth";

const remote = () =>
  new Request("https://agent.example.com/eve/v1/chat", {
    headers: { "x-zo-initiator": JSON.stringify({ userId: "usr_1", agentId: "agt_1" }) },
  });

describe("verifiedInitiatorAuth", () => {
  test("no authorization header → null (falls through, never anonymous)", async () => {
    const auth = verifiedInitiatorAuth(["owner:project:*"]);
    expect(await auth(remote())).toBeNull();
  });

  test("a garbage bearer → null, and the initiator header is NOT trusted", async () => {
    const auth = verifiedInitiatorAuth(["owner:project:*"]);
    const request = new Request("https://agent.example.com/eve/v1/chat", {
      headers: {
        authorization: "Bearer not-a-jwt",
        "x-zo-initiator": JSON.stringify({ userId: "usr_1", agentId: "agt_1" }),
      },
    });
    expect(await auth(request)).toBeNull();
  });
});

describe("zoChannelAuth", () => {
  test("subjects configured → verified walk with NO anonymous entry", async () => {
    const walk = zoChannelAuth("owner:project:*");
    expect(walk).toHaveLength(2);
    // First entry rejects an unverified caller.
    expect(await walk[0]!(remote())).toBeNull();
    // Second is localDev(): loopback-only, so a remote request gets nothing.
    // If this ever returns a context, the walk has become anonymously accepting.
    expect(await walk[1]!(remote())).toBeNull();
  });

  test("no subjects → migration walk that still serves a deployed agent", async () => {
    const walk = zoChannelAuth("");
    expect(walk).toHaveLength(2);
    // Pre-OIDC behavior: the injected initiator header is trusted directly.
    const ctx = await walk[0]!(remote());
    expect(ctx).toMatchObject({ principalId: "usr_1", authenticator: "zo-initiator" });
  });

  test("whitespace-only subjects are treated as unconfigured", async () => {
    const walk = zoChannelAuth("  ,  ");
    const ctx = await walk[0]!(remote());
    expect(ctx).toMatchObject({ principalId: "usr_1" });
  });

  test("defaults to ZO_API_OIDC_SUBJECTS when no argument is passed", async () => {
    const prior = process.env.ZO_API_OIDC_SUBJECTS;
    try {
      process.env.ZO_API_OIDC_SUBJECTS = "owner:project:*";
      // Configured → the verified walk, which rejects this unverified caller.
      expect(await zoChannelAuth()[0]!(remote())).toBeNull();
      delete process.env.ZO_API_OIDC_SUBJECTS;
      // Unconfigured → the migration walk, which trusts the header.
      expect(await zoChannelAuth()[0]!(remote())).toMatchObject({ principalId: "usr_1" });
    } finally {
      if (prior === undefined) delete process.env.ZO_API_OIDC_SUBJECTS;
      else process.env.ZO_API_OIDC_SUBJECTS = prior;
    }
  });
});
