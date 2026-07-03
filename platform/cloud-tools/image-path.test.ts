import { describe, expect, test } from "bun:test";

import {
  extensionForMediaType,
  imageOutputPath,
  slugForPrompt,
} from "./image-path";

describe("image path helpers", () => {
  test("slugifies prompts for filenames", () => {
    expect(slugForPrompt("  Neon city, after rain!! ")).toBe(
      "neon-city-after-rain",
    );
    expect(slugForPrompt("!!!")).toBe("image");
  });

  test("maps common media types to extensions", () => {
    expect(extensionForMediaType("image/png")).toBe("png");
    expect(extensionForMediaType("image/jpeg")).toBe("jpg");
    expect(extensionForMediaType("application/octet-stream")).toBe("bin");
  });

  test("projects a stable relative output path", () => {
    expect(
      imageOutputPath({
        id: "abc123",
        mediaType: "image/webp",
        outputDir: "artifacts/",
        prompt: "A tiny robot with a paintbrush",
      }),
    ).toBe("artifacts/a-tiny-robot-with-a-paintbrush-abc123.webp");
  });
});
