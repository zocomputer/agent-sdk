import { describe, expect, test } from "bun:test";
import {
  CHAT_ATTACHMENT_FIELD,
  readImageChatAttachment,
} from "./attachments";

describe("readImageChatAttachment", () => {
  const valid = {
    kind: "image" as const,
    dataUrl: "data:image/png;base64,iVBORw0KGgo=",
    mediaType: "image/png",
    filename: "pic.png",
    width: 2,
    height: 2,
  };

  test("reads a well-formed attachment off a tool result", () => {
    const result = { source: "image", [CHAT_ATTACHMENT_FIELD]: valid };
    expect(readImageChatAttachment(result)).toEqual(valid);
  });

  test("defaults filename and dimensions when absent", () => {
    const result = {
      [CHAT_ATTACHMENT_FIELD]: {
        kind: "image",
        dataUrl: "data:image/gif;base64,AA==",
        mediaType: "image/gif",
      },
    };
    expect(readImageChatAttachment(result)).toEqual({
      kind: "image",
      dataUrl: "data:image/gif;base64,AA==",
      mediaType: "image/gif",
      filename: "image",
      width: null,
      height: null,
    });
  });

  test("returns null when there is no attachment", () => {
    expect(readImageChatAttachment({ source: "image", note: "…" })).toBeNull();
    expect(readImageChatAttachment({ content: "line 1" })).toBeNull();
  });

  test("returns null for malformed / non-object input", () => {
    expect(readImageChatAttachment(null)).toBeNull();
    expect(readImageChatAttachment("nope")).toBeNull();
    expect(readImageChatAttachment([valid])).toBeNull();
    expect(
      readImageChatAttachment({ [CHAT_ATTACHMENT_FIELD]: { kind: "video" } }),
    ).toBeNull();
    expect(
      readImageChatAttachment({
        [CHAT_ATTACHMENT_FIELD]: { kind: "image", mediaType: "image/png" },
      }),
    ).toBeNull();
    expect(
      readImageChatAttachment({
        [CHAT_ATTACHMENT_FIELD]: { kind: "image", dataUrl: "", mediaType: "image/png" },
      }),
    ).toBeNull();
  });
});
