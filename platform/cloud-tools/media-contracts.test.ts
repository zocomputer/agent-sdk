import { describe, expect, test } from "bun:test";

import {
  MEDIA_TOOL_NAMES,
  type MediaModelKind,
  type MediaOperation,
  type MediaToolName,
} from "./media-contracts";

const OPERATION_KIND = {
  "audio.transcribe": "transcription",
  "image.edit": "image",
  "image.generate": "image",
  "speech.generate": "speech",
  "video.edit": "video",
  "video.generate": "video",
} as const satisfies Record<MediaOperation, MediaModelKind>;

const TOOL_OPERATION = {
  edit_image: "image.edit",
  edit_video: "video.edit",
  generate_image: "image.generate",
  generate_speech: "speech.generate",
  generate_video: "video.generate",
  media_models: null,
  transcribe_audio: "audio.transcribe",
} as const satisfies Record<MediaToolName, MediaOperation | null>;

describe("media contracts", () => {
  test("the final tool roster stays explicit and prior-aligned", () => {
    expect(MEDIA_TOOL_NAMES).toEqual([
      "media_models",
      "generate_image",
      "edit_image",
      "generate_video",
      "edit_video",
      "generate_speech",
      "transcribe_audio",
    ]);
    expect(Object.keys(TOOL_OPERATION).sort()).toEqual([...MEDIA_TOOL_NAMES].sort());
  });

  test("every paid operation maps to exactly one media model kind", () => {
    expect(OPERATION_KIND).toEqual({
      "audio.transcribe": "transcription",
      "image.edit": "image",
      "image.generate": "image",
      "speech.generate": "speech",
      "video.edit": "video",
      "video.generate": "video",
    });
  });
});
