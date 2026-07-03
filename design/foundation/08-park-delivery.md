# Park delivery

## The decision

Anything that must reach the model *after* a tool result has returned is
queued and delivered as the **next user turn**: `createParkDeliveryState`
queues keyed items per session, and `createParkDeliveryHook` watches the
runtime stream from inside the agent's own server process and, the moment the
session parks, sends the batch back into the session over loopback
`eve/client` — exactly like a user hitting send. The first clients are
`read`/`webfetch` **image bytes** (riding the chat-attachment contract) and
background-task **`notify` matches** ([07](./07-background-tasks.md)); the
steering backstop rides it too ([12](./12-mid-turn-steering.md)).

## Why

eve gives tools no way to message the model after their result returns: hooks
are observe-only for model context, tool results are text/json-only, and a
parked session just sits there. Two capabilities genuinely need a push path:

- **Media.** A `read` of an image can return only metadata. The bytes reach
  the model only via a follow-up user turn whose file part hydrates through
  eve's attachment pipeline — inlining base64 into a result would reproduce
  opencode's tokenized-base64 blowup deliberately.
- **Async progress.** A backgrounded task outlives its tool result; without a
  push path the model must poll or stall.

Delivery-as-a-user-send is the key insight rather than a compromise: it uses
no private API, and the delivered batch is **durable, replayable, and rendered
by every client for free** — it's just a message in the stream. The hook
doesn't mutate the running turn (eve hooks can't); it starts the next one.

## The mechanics that make it correct

- **Deliver exactly at park.** Items release as one batch on
  `session.waiting` — or immediately from enqueue when the session is
  *already* parked, since no later stream event will flush it.
- **Per-key dedupe, re-queue on failed send, and a retry ladder** for the
  park/send race.
- **A `globalThis` bridge** so a notification posted in one rebuilt module
  graph reaches the hook created in another (the same hot-reload constraint
  as the task registry).
- **The pure decision core is exported** (`redeliveryFromEvent`,
  `createRedeliveryState`, `buildRedeliveryMessage`) for hosts that would
  rather run delivery elsewhere, and the attachment contract lives on a
  dependency-free subpath so UI clients can render attachments without the
  extraction deps.

## Status

This is a workaround with a documented expiry: native multimodal tool results
upstream would delete the image leg, and a first-class "deliver to this
session when it parks" API would delete the park detection. Both are on the
README's upstream-asks list ([13](./13-work-with-the-grain-of-eve.md)). Until
then the pattern is fully app-side and portable to any eve agent.

## Sources

- `rib/learnings/26-park-delivery.md` — the mechanics.
- `rib/learnings/17-rich-filetype-reads.md` — why images can't ride results.
- `plans/ben/agent-sdk-media-reads.md` — the media-reads design.
