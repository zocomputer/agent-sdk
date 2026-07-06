import { describe, expect, test } from "bun:test";
import { agentAuthHeaders } from "./gateway";

describe("agentAuthHeaders", () => {
  test("returns the header when a token is present", () => {
    expect(agentAuthHeaders("tok-123")).toEqual({ "x-zo-agent-token": "tok-123" });
  });

  test("trims surrounding whitespace", () => {
    expect(agentAuthHeaders("  tok-123\n")).toEqual({ "x-zo-agent-token": "tok-123" });
  });

  test("absent token → no header (secretless dev stays anonymous)", () => {
    expect(agentAuthHeaders(undefined)).toEqual({});
  });

  test("blank token → no header (an empty env line is not a token)", () => {
    expect(agentAuthHeaders("   ")).toEqual({});
  });
});
