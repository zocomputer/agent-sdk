// ../../../../../tmp/agent-sdk-mirror-jZ8aTM/repo/src/attachments.ts
var CHAT_ATTACHMENT_FIELD = "chatAttachment";
var DEFAULT_MAX_INLINE_IMAGE_BYTES = 3 * 1024 * 1024;
var DEFAULT_MAX_INLINE_MEDIA_BYTES = 10 * 1024 * 1024;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readChatAttachment(toolOutput) {
  if (!isRecord(toolOutput))
    return null;
  const raw = toolOutput[CHAT_ATTACHMENT_FIELD];
  if (!isRecord(raw))
    return null;
  if (typeof raw.dataUrl !== "string" || raw.dataUrl.length === 0)
    return null;
  if (typeof raw.mediaType !== "string" || raw.mediaType.length === 0)
    return null;
  const base = {
    dataUrl: raw.dataUrl,
    mediaType: raw.mediaType
  };
  switch (raw.kind) {
    case "image":
      return {
        kind: "image",
        ...base,
        filename: typeof raw.filename === "string" ? raw.filename : "image",
        width: typeof raw.width === "number" ? raw.width : null,
        height: typeof raw.height === "number" ? raw.height : null
      };
    case "video":
      return {
        kind: "video",
        ...base,
        filename: typeof raw.filename === "string" ? raw.filename : "video"
      };
    case "audio":
      return {
        kind: "audio",
        ...base,
        filename: typeof raw.filename === "string" ? raw.filename : "audio"
      };
    default:
      return null;
  }
}
export {
  readChatAttachment,
  DEFAULT_MAX_INLINE_MEDIA_BYTES,
  DEFAULT_MAX_INLINE_IMAGE_BYTES,
  CHAT_ATTACHMENT_FIELD
};
