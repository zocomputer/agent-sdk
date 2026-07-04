import { describe, expect, test } from "bun:test";
import { CHAT_ATTACHMENT_FIELD } from "./attachments";
import {
  buildRedeliveryMessage,
  clientContinuationToken,
  createRedeliveryState,
  redeliveryFromEvent,
} from "./redeliver";

const attachment = {
  kind: "image" as const,
  dataUrl: "data:image/png;base64,iVBORw0KGgo=",
  mediaType: "image/png",
  filename: "pic.png",
  width: 2,
  height: 2,
};

function actionResult(callId: string, output: unknown) {
  return {
    type: "action.result",
    data: {
      result: { kind: "tool-result", callId, toolName: "read", output },
      status: "completed",
      sequence: 1,
      stepIndex: 0,
      turnId: "turn-1",
    },
  };
}

const imageResult = (callId: string) =>
  actionResult(callId, { source: "image", [CHAT_ATTACHMENT_FIELD]: attachment });

const waiting = { type: "session.waiting", data: { wait: "next-user-message" } };

describe("redeliveryFromEvent", () => {
  test("extracts the attachment + call id from a read image result", () => {
    const found = redeliveryFromEvent(imageResult("call-1"));
    expect(found).toEqual({ toolCallId: "call-1", attachment });
  });

  test("extracts video and audio attachments too", () => {
    const video = {
      kind: "video" as const,
      dataUrl: "data:video/mp4;base64,AA==",
      mediaType: "video/mp4",
      filename: "clip.mp4",
    };
    expect(
      redeliveryFromEvent(
        actionResult("call-v", { source: "video", [CHAT_ATTACHMENT_FIELD]: video }),
      ),
    ).toEqual({ toolCallId: "call-v", attachment: video });
    const audio = {
      kind: "audio" as const,
      dataUrl: "data:audio/mpeg;base64,AA==",
      mediaType: "audio/mpeg",
      filename: "song.mp3",
    };
    expect(
      redeliveryFromEvent(
        actionResult("call-a", { source: "audio", [CHAT_ATTACHMENT_FIELD]: audio }),
      ),
    ).toEqual({ toolCallId: "call-a", attachment: audio });
  });

  test("ignores non-attachment results and other events", () => {
    expect(redeliveryFromEvent(actionResult("c", { content: "1|hi" }))).toBeNull();
    expect(redeliveryFromEvent(waiting)).toBeNull();
    expect(redeliveryFromEvent({ type: "action.result", data: {} })).toBeNull();
    expect(redeliveryFromEvent(null)).toBeNull();
    expect(
      redeliveryFromEvent({
        type: "action.result",
        data: { result: { kind: "subagent-result" } },
      }),
    ).toBeNull();
  });
});

describe("buildRedeliveryMessage", () => {
  test("leads with a text part naming the files, then the file parts", () => {
    const message = buildRedeliveryMessage([
      { toolCallId: "a", attachment },
      { toolCallId: "b", attachment: { ...attachment, filename: "b.png" } },
    ]);
    expect(message[0]).toEqual({
      type: "text",
      text: "Attached: pic.png, b.png (auto-attached from read).",
    });
    expect(message.slice(1)).toEqual([
      { type: "file", data: attachment.dataUrl, mediaType: "image/png", filename: "pic.png" },
      { type: "file", data: attachment.dataUrl, mediaType: "image/png", filename: "b.png" },
    ]);
  });

  test("mixed media build file parts with their own media types", () => {
    const video = {
      kind: "video" as const,
      dataUrl: "data:video/webm;base64,AA==",
      mediaType: "video/webm",
      filename: "capture.webm",
    };
    const message = buildRedeliveryMessage([
      { toolCallId: "a", attachment },
      { toolCallId: "b", attachment: video },
    ]);
    expect(message[0]).toEqual({
      type: "text",
      text: "Attached: pic.png, capture.webm (auto-attached from read).",
    });
    expect(message[2]).toEqual({
      type: "file",
      data: video.dataUrl,
      mediaType: "video/webm",
      filename: "capture.webm",
    });
  });
});

describe("clientContinuationToken", () => {
  test("strips the runtime namespace (everything before the first colon)", () => {
    // The default HTTP channel's client token is itself `eve:<uuid>`, so the
    // runtime form is doubly prefixed — only the namespace comes off.
    expect(clientContinuationToken("eve:eve:1234-abcd")).toBe("eve:1234-abcd");
  });

  test("keeps tokens that are already client-facing", () => {
    // Remainder without a colon means the input had no namespace layer.
    expect(clientContinuationToken("eve:1234-abcd")).toBe("eve:1234-abcd");
    expect(clientContinuationToken("tok-1")).toBe("tok-1");
  });
});

describe("createRedeliveryState", () => {
  const meta = { sessionId: "s1", continuationToken: "tok-1" };

  test("requests delivery when the session parks with pending images", () => {
    const state = createRedeliveryState();
    expect(state.observe(imageResult("call-1"), meta)).toBeNull();
    const request = state.observe(waiting, meta);
    expect(request).toEqual({
      sessionId: "s1",
      continuationToken: "tok-1",
      pending: [{ toolCallId: "call-1", attachment }],
    });
  });

  test("stores the client-facing token from the runtime-namespaced one", () => {
    const state = createRedeliveryState();
    state.observe(imageResult("call-1"), {
      sessionId: "s1",
      continuationToken: "eve:eve:1234-abcd",
    });
    const request = state.observe(waiting, { sessionId: "s1" });
    expect(request?.continuationToken).toBe("eve:1234-abcd");
  });

  test("parks with nothing pending request nothing", () => {
    const state = createRedeliveryState();
    expect(state.observe(waiting, meta)).toBeNull();
  });

  test("delivers each image once across parks", () => {
    const state = createRedeliveryState();
    state.observe(imageResult("call-1"), meta);
    expect(state.observe(waiting, meta)).not.toBeNull();
    // Same call id observed again (e.g. duplicated event) stays delivered.
    state.observe(imageResult("call-1"), meta);
    expect(state.observe(waiting, meta)).toBeNull();
  });

  test("a failed send re-queues for the next park", () => {
    const state = createRedeliveryState();
    state.observe(imageResult("call-1"), meta);
    const request = state.observe(waiting, meta);
    if (!request) throw new Error("expected a request");
    state.settle(request, false);
    const retry = state.observe(waiting, meta);
    expect(retry?.pending.map((p) => p.toolCallId)).toEqual(["call-1"]);
  });

  test("a successful send settles permanently", () => {
    const state = createRedeliveryState();
    state.observe(imageResult("call-1"), meta);
    const request = state.observe(waiting, meta);
    if (!request) throw new Error("expected a request");
    state.settle(request, true);
    expect(state.observe(waiting, meta)).toBeNull();
  });

  test("uses the latest continuation token seen for the session", () => {
    const state = createRedeliveryState();
    state.observe(imageResult("call-1"), { sessionId: "s1", continuationToken: "old" });
    const request = state.observe(waiting, { sessionId: "s1", continuationToken: "new" });
    expect(request?.continuationToken).toBe("new");
  });

  test("holds delivery when no continuation token has been seen", () => {
    const state = createRedeliveryState();
    state.observe(imageResult("call-1"), { sessionId: "s1" });
    expect(state.observe(waiting, { sessionId: "s1" })).toBeNull();
    // Token arrives on a later event → next park delivers.
    expect(
      state.observe(waiting, { sessionId: "s1", continuationToken: "tok" }),
    ).not.toBeNull();
  });

  test("sessions are independent and terminal events clear state", () => {
    const state = createRedeliveryState();
    state.observe(imageResult("call-1"), { sessionId: "s1", continuationToken: "t1" });
    state.observe(imageResult("call-2"), { sessionId: "s2", continuationToken: "t2" });
    state.observe({ type: "session.completed", data: {} }, { sessionId: "s1" });
    expect(state.observe(waiting, { sessionId: "s1", continuationToken: "t1" })).toBeNull();
    const s2 = state.observe(waiting, { sessionId: "s2" });
    expect(s2?.pending.map((p) => p.toolCallId)).toEqual(["call-2"]);
  });
});
