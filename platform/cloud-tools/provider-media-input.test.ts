import { describe, expect, test } from "bun:test";
import { createProviderMediaInputResolver } from "./provider-media-input";

const ref = { type: "state_asset", declarationName: "files", path: "uploads/cat.png" } as const;
const body = new Uint8Array([1, 2, 3]);

describe("provider media input", () => {
  test("delivers bounded bytes", async () => {
    const resolve = createProviderMediaInputResolver({
      read: async () => ({ ref, body, kind: "image", contentType: "image/png", bytes: 3 }),
    });
    await expect(resolve({ ref, delivery: "bytes", maxBytes: 10, acceptedKinds: ["image"] })).resolves.toEqual({ delivery: "bytes", body, contentType: "image/png" });
  });

  test("keeps a failed secret URL out of the error", async () => {
    const secret = "https://signed.test/object?credential=secret";
    const resolve = createProviderMediaInputResolver({
      read: async () => ({ ref, body, kind: "image", contentType: "image/png", bytes: 3 }),
      resolveUrl: async () => { throw new Error(secret); },
    });
    const error = await resolve({ ref, delivery: "url", maxBytes: 10, acceptedKinds: ["image"] }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).not.toContain(secret);
    expect(String(error)).not.toContain("credential");
  });
});
