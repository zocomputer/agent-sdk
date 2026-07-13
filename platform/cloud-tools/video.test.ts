import { describe, expect, test } from "bun:test";

import { createBoundedVideoDownload, generateVideoTool } from "./video";
import { mediaAsset, preflight, recordingWriter, toolContext, videoResult } from "./video-test-helpers";

describe("generateVideoTool", () => {
  test("preflights, generates, and persists before returning", async () => {
    const writer = recordingWriter();
    const captured: unknown[] = [];
    const tool = generateVideoTool({ assetWriter: writer, preflight: preflight(), randomId: () => "vid99999", generate: async (options) => { captured.push(options); return videoResult(); } });
    const output = await tool.execute({ prompt: "A calico cat", aspect_ratio: "16:9", duration_seconds: 5 }, toolContext);
    expect(captured[0]).toMatchObject({ aspectRatio: "16:9", duration: 5, prompt: "A calico cat" });
    expect(JSON.stringify(captured[0])).toContain('"x-zo-tool":"generate_video"');
    expect(JSON.stringify(captured[0])).toContain("video.generate");
    expect(writer.writes[0]?.path).toBe("generated/a-calico-cat-vid99999.mp4");
    expect(output.asset.path).toBe("generated/a-calico-cat-vid99999.mp4");
    expect(JSON.stringify(output)).not.toContain("http");
  });

  test("derives first/last-frame and reference modes from durable assets", async () => {
    const first = mediaAsset("first.png");
    const last = mediaAsset("last.png");
    const calls: unknown[] = [];
    const tool = generateVideoTool({ assetWriter: recordingWriter(), preflight: preflight("video.generate", [first, last]), generate: async (call) => { calls.push(call); return videoResult(); } });
    await tool.execute({ prompt: "morph", start_frame_asset: "files:first.png", end_frame_asset: "files:last.png" }, toolContext);
    expect(calls[0]).toMatchObject({ frameImages: [{ frameType: "first_frame" }, { frameType: "last_frame" }] });

    const referenceTool = generateVideoTool({ assetWriter: recordingWriter(), preflight: preflight("video.generate", [first]), generate: async (call) => { calls.push(call); return videoResult(); } });
    await referenceTool.execute({ prompt: "same style", reference_asset: "files:first.png" }, toolContext);
    expect(calls[1]).toMatchObject({ inputReferences: [first.body] });
  });

  test("rejects ambiguous modes before provider spend", async () => {
    let calls = 0;
    const tool = generateVideoTool({ assetWriter: recordingWriter(), preflight: preflight(), generate: async () => { calls += 1; return videoResult(); } });
    await expect(tool.execute({ prompt: "bad", end_frame_asset: "files:last.png" }, toolContext)).rejects.toThrow("requires start_frame_asset");
    expect(calls).toBe(0);
  });

  test("runs without an approval gate (pre-production posture: nothing is approval-gated)", () => {
    const tool = generateVideoTool({ preflight: preflight() });
    expect(tool.approval).toBeUndefined();
  });
});

describe("createBoundedVideoDownload", () => {
  test("downloads HTTPS output within the byte cap", async () => {
    const download = createBoundedVideoDownload({ maxBytes: 4, fetch: async () => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "video/mp4" } }) });
    await expect(download({ url: new URL("https://provider.example/out") })).resolves.toEqual({ data: new Uint8Array([1, 2, 3]), mediaType: "video/mp4" });
  });

  test("rejects insecure and oversized output", async () => {
    const download = createBoundedVideoDownload({ maxBytes: 2, fetch: async () => new Response(new Uint8Array([1, 2, 3])) });
    await expect(download({ url: new URL("http://provider.example/out") })).rejects.toThrow("requires HTTPS");
    await expect(download({ url: new URL("https://provider.example/out") })).rejects.toThrow("download limit");
  });
});
