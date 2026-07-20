import { describe, expect, test } from "bun:test";
import type { SandboxSessionContext } from "eve/sandbox";
import type { ZoBackendSessionOptions } from "./zo-backend";
import { zoSandbox } from "./zo-sandbox";

describe("zoSandbox", () => {
  test("passes the shared auth reader's capability into the backend session", async () => {
    const onSession = zoSandbox().onSession;
    if (onSession === undefined) throw new Error("zoSandbox must define onSession");
    const usedOptions: Array<ZoBackendSessionOptions | undefined> = [];
    const input = {
      ctx: {
        session: {
          id: "wrun_test",
          auth: {
            current: {
              attributes: { zoSessionCapability: "fresh-capability" },
              authenticator: "test",
              principalId: "user_test",
              principalType: "user",
            },
            initiator: {
              attributes: { zoSessionCapability: "bootstrap-capability" },
              authenticator: "test",
              principalId: "user_test",
              principalType: "user",
            },
          },
          turn: { id: "turn_test", sequence: 0 },
        },
        getSandbox: () => Promise.reject(new Error("unused")),
        getSkill: () => {
          throw new Error("unused");
        },
      },
      use: (options) => {
        usedOptions.push(options);
        return Promise.reject(new Error("captured"));
      },
    } satisfies SandboxSessionContext<ZoBackendSessionOptions>;

    await expect(onSession(input)).rejects.toThrow("captured");
    expect(usedOptions).toEqual([{ sessionCapability: "fresh-capability" }]);
  });
});
