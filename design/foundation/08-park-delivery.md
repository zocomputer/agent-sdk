# Park delivery

## The decision

Anything that must reach the model *after* a tool result has returned is
queued and delivered as the **next user turn**: `createParkDeliveryState`
queues keyed items per session, and `createParkDeliveryHook` watches the
runtime stream from inside the agent's own server process and, the moment the
session parks, sends the batch back into the session over loopback
`eve/client` — exactly like a user hitting send. Its clients are background-task
**`notify` matches** ([07](./07-background-tasks.md)) and the steering
backstop ([12](./12-mid-turn-steering.md)).

## Why

eve gives tools no way to message the model after their result returns: hooks
are observe-only for model context, tool results are text/json-only, and a
parked session just sits there. A backgrounded task outlives its tool result;
without a push path the model must poll or stall.

Delivery-as-a-user-send uses no private API, and the delivered batch is
**durable, replayable, and rendered by every client for free** — it's a
message in the stream like any other. The hook doesn't mutate the running
turn (eve hooks can't); it starts the next one.

## The mechanics that make it correct

- **Deliver exactly at park.** Items release as one batch on
  `session.waiting` — or immediately from enqueue when the session is
  *already* parked, since no later stream event will flush it.
- **Per-key dedupe, re-queue on failed send, and a retry ladder** for the
  park/send race.
- **A `globalThis` bridge** so a notification posted in one rebuilt module
  graph reaches the hook created in another (the same hot-reload constraint
  as the task registry).
- **The generic decision core is exported** (`createParkDeliveryState`) for
  hosts that would rather run delivery elsewhere.

## Status

This is a workaround with a documented expiry: a first-class "deliver to this
session when it parks" API would delete the park detection. It remains on the
upstream-asks list ([13](./13-work-with-the-grain-of-eve.md)). Until then the
pattern is app-side and portable to any eve agent.

## Sources

- `rib/learnings/26-park-delivery.md` — the mechanics.
