import { describe, expect, test } from "bun:test";
import {
  CHAT_ATTACHMENT_FIELD,
  readChatAttachment,
} from "./attachments";

describe("readChatAttachment", () => {
  const validImage = {
    kind: "image" as const,
    dataUrl: "data:image/png;base64,iVBORw0KGgo=",
    mediaType: "image/png",
    filename: "pic.png",
    width: 2,
    height: 2,
  };

  test("reads a well-formed image attachment off a tool result", () => {
    const result = { source: "image", [CHAT_ATTACHMENT_FIELD]: validImage };
    expect(readChatAttachment(result)).toEqual(validImage);
  });

  test("reads video and audio attachments", () => {
    const video = {
      kind: "video" as const,
      dataUrl: "data:video/mp4;base64,AAAAGGZ0eXA=",
      mediaType: "video/mp4",
      filename: "clip.mp4",
    };
    expect(readChatAttachment({ [CHAT_ATTACHMENT_FIELD]: video })).toEqual(video);

    const audio = {
      kind: "audio" as const,
      dataUrl: "data:audio/mpeg;base64,SUQz",
      mediaType: "audio/mpeg",
      filename: "song.mp3",
    };
    expect(readChatAttachment({ [CHAT_ATTACHMENT_FIELD]: audio })).toEqual(audio);
  });

  test("defaults filename (and image dimensions) when absent", () => {
    expect(
      readChatAttachment({
        [CHAT_ATTACHMENT_FIELD]: {
          kind: "image",
          dataUrl: "data:image/gif;base64,AA==",
          mediaType: "image/gif",
        },
      }),
    ).toEqual({
      kind: "image",
      dataUrl: "data:image/gif;base64,AA==",
      mediaType: "image/gif",
      filename: "image",
      width: null,
      height: null,
    });
    expect(
      readChatAttachment({
        [CHAT_ATTACHMENT_FIELD]: {
          kind: "video",
          dataUrl: "data:video/webm;base64,AA==",
          mediaType: "video/webm",
        },
      }),
    ).toEqual({
      kind: "video",
      dataUrl: "data:video/webm;base64,AA==",
      mediaType: "video/webm",
      filename: "video",
    });
    expect(
      readChatAttachment({
        [CHAT_ATTACHMENT_FIELD]: {
          kind: "audio",
          dataUrl: "data:audio/wav;base64,AA==",
          mediaType: "audio/wav",
        },
      }),
    ).toEqual({
      kind: "audio",
      dataUrl: "data:audio/wav;base64,AA==",
      mediaType: "audio/wav",
      filename: "audio",
    });
  });

  test("returns null when there is no attachment", () => {
    expect(readChatAttachment({ source: "image", note: "…" })).toBeNull();
    expect(readChatAttachment({ content: "line 1" })).toBeNull();
  });

  test("returns null for malformed / non-object input", () => {
    expect(readChatAttachment(null)).toBeNull();
    expect(readChatAttachment("nope")).toBeNull();
    expect(readChatAttachment([validImage])).toBeNull();
    // Unknown kind.
    expect(
      readChatAttachment({
        [CHAT_ATTACHMENT_FIELD]: {
          kind: "hologram",
          dataUrl: "data:application/octet-stream;base64,AA==",
          mediaType: "application/octet-stream",
        },
      }),
    ).toBeNull();
    // Missing / empty required fields.
    expect(
      readChatAttachment({ [CHAT_ATTACHMENT_FIELD]: { kind: "video" } }),
    ).toBeNull();
    expect(
      readChatAttachment({
        [CHAT_ATTACHMENT_FIELD]: { kind: "image", mediaType: "image/png" },
      }),
    ).toBeNull();
    expect(
      readChatAttachment({
        [CHAT_ATTACHMENT_FIELD]: { kind: "image", dataUrl: "", mediaType: "image/png" },
      }),
    ).toBeNull();
  });
});
