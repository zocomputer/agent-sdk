import { describe, expect, test } from "bun:test";

import {
  assetOutputPath,
  extensionForMediaType,
  slugForPrompt,
} from "./asset-path";

describe("asset path helpers", () => {
  test("slugifies prompts for filenames", () => {
    expect(slugForPrompt("  Neon city, after rain!! ")).toBe(
      "neon-city-after-rain",
    );
    expect(slugForPrompt("!!!")).toBe("asset");
    expect(slugForPrompt("!!!", "video")).toBe("video");
  });

  test("maps common media types to extensions", () => {
    expect(extensionForMediaType("image/png")).toBe("png");
    expect(extensionForMediaType("image/jpeg")).toBe("jpg");
    expect(extensionForMediaType("video/mp4")).toBe("mp4");
    expect(extensionForMediaType("video/webm")).toBe("webm");
    expect(extensionForMediaType("application/octet-stream")).toBe("bin");
  });

  test("projects a stable relative output path", () => {
    expect(
      assetOutputPath({
        id: "abc123",
        mediaType: "image/webp",
        outputDir: "artifacts/",
        prompt: "A tiny robot with a paintbrush",
      }),
    ).toBe("artifacts/a-tiny-robot-with-a-paintbrush-abc123.webp");
  });

  test("uses the fallback slug for a promptless media asset", () => {
    expect(
      assetOutputPath({
        id: "vid001",
        mediaType: "video/mp4",
        prompt: "！！！",
        fallbackSlug: "video",
      }),
    ).toBe("generated/video-vid001.mp4");
  });
});
