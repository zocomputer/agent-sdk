import { describe, expect, test } from "bun:test";
import { fetchMediaCatalog, resolveZoGatewayCatalogUrl } from "./catalog";

const testFetch = (run: (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => Promise<Response>): typeof fetch => Object.assign(run, { preconnect: () => undefined });

describe("fetchMediaCatalog", () => {
  test("fails closed when the configured proxy cannot identify the catalog route", () => {
    expect(() => resolveZoGatewayCatalogUrl("https://example.com/custom/inference"))
      .toThrow("must end in /v4/ai");
  });
  test("rewrites the proxy inference endpoint and sends auth and validators", async () => {
    let url: string | undefined; let headers: Headers | undefined;
    const result = await fetchMediaCatalog({
      baseURL: "https://zo.test/runtime/ai/v4/ai", apiKey: "secret",
      validators: { etag: "old" }, now: () => new Date("2026-07-12T00:00:00Z"),
      fetch: testFetch(async (input, init) => { url = input instanceof Request ? input.url : input.toString(); headers = new Headers(init?.headers); return new Response(null, { status: 304, headers: { etag: "new" } }); }),
    });
    expect(url).toBe("https://zo.test/runtime/ai/v1/models");
    expect(headers?.get("authorization")).toBe("Bearer secret");
    expect(headers?.get("if-none-match")).toBe("old");
    expect(result).toEqual({ status: "not_modified", validatedAt: "2026-07-12T00:00:00.000Z", validators: { etag: "new" } });
  });

  test("returns an unknown modified envelope", async () => {
    const result = await fetchMediaCatalog({ fetch: testFetch(async () => Response.json({ data: [{ type: "image" }] })) });
    expect(result.status).toBe("modified");
    if (result.status === "modified") expect(result.raw).toEqual({ data: [{ type: "image" }] });
  });
});
