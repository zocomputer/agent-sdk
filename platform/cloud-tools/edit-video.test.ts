import { describe, expect, test } from "bun:test";

import { editVideoTool } from "./edit-video";
import { mediaAsset, preflight, recordingWriter, toolContext, videoResult } from "./video-test-helpers";

describe("editVideoTool", () => {
  test("uses a trusted internal source URL and persists provider output immediately", async () => {
    const source = mediaAsset("source.mp4", "video");
    const writer = recordingWriter();
    const calls: unknown[] = [];
    const tool = editVideoTool({
      assetWriter: writer,
      preflight: preflight("video.edit", [source]),
      randomId: () => "edit0001",
      resolveProviderInput: async () => ({ delivery: "url", url: new URL("https://internal.invalid/signed"), contentType: "video/mp4" }),
      generate: async (call) => { calls.push(call); return videoResult(); },
    });
    const output = await tool.execute({ input_asset: "files:source.mp4", prompt: "make it rainy" }, toolContext);
    expect(calls[0]).toMatchObject({ providerOptions: { xai: { videoUrl: "https://internal.invalid/signed" } } });
    expect(JSON.stringify(calls[0])).toContain('"x-zo-tool":"edit_video"');
    expect(JSON.stringify(calls[0])).toContain("video.edit");
    expect(writer.writes).toHaveLength(1);
    expect(output.asset.path).toBe("generated/make-it-rainy-edit0001.mp4");
    expect(JSON.stringify(output)).not.toContain("internal.invalid");
  });

  test("fails closed before provider call when URL delivery rejects", async () => {
    let calls = 0;
    const source = mediaAsset("source.mp4", "video");
    const badUrl = editVideoTool({ assetWriter: recordingWriter(), preflight: preflight("video.edit", [source]), resolveProviderInput: async () => { throw new Error("expired"); }, generate: async () => { calls += 1; return videoResult(); } });
    await expect(badUrl.execute({ input_asset: "files:source.mp4", prompt: "edit" }, toolContext)).rejects.toThrow("expired");
    expect(calls).toBe(0);
  });

  test("uses the asset store's trusted URL resolver by default", async () => {
    const source = mediaAsset("source.mp4", "video");
    const writer = recordingWriter();
    const urls: string[] = [];
    const tool = editVideoTool({
      assetStore: {
        write: async (path, body, options) => writer.write(path, body, options),
        read: async () => source,
        resolveUrl: async (ref, expiry) => {
          urls.push(`${ref.path}:${expiry}`);
          return new URL("https://internal.invalid/exact-object?X-Amz-Signature=secret");
        },
      },
      preflight: preflight("video.edit", [source]),
      generate: async () => videoResult(),
    });
    const output = await tool.execute({ input_asset: "files:source.mp4", prompt: "edit" }, toolContext);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toStartWith("source.mp4:");
    expect(JSON.stringify(output)).not.toContain("X-Amz-Signature");
    expect(JSON.stringify(output)).not.toContain("internal.invalid");
  });

  test("runs without an approval gate (pre-production posture: nothing is approval-gated)", () => {
    const tool = editVideoTool();
    expect(tool.approval).toBeUndefined();
  });
});
