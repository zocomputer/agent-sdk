// ../../../../../tmp/agent-sdk-mirror-qr7iHR/repo/src/attachments.ts
var CHAT_ATTACHMENT_FIELD = "chatAttachment";
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readImageChatAttachment(toolOutput) {
  if (!isRecord(toolOutput))
    return null;
  const raw = toolOutput[CHAT_ATTACHMENT_FIELD];
  if (!isRecord(raw))
    return null;
  if (raw.kind !== "image")
    return null;
  if (typeof raw.dataUrl !== "string" || raw.dataUrl.length === 0)
    return null;
  if (typeof raw.mediaType !== "string" || raw.mediaType.length === 0)
    return null;
  return {
    kind: "image",
    dataUrl: raw.dataUrl,
    mediaType: raw.mediaType,
    filename: typeof raw.filename === "string" ? raw.filename : "image",
    width: typeof raw.width === "number" ? raw.width : null,
    height: typeof raw.height === "number" ? raw.height : null
  };
}
export {
  readImageChatAttachment,
  CHAT_ATTACHMENT_FIELD
};
