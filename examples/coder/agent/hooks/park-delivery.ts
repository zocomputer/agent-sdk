import { createParkDeliveryHook } from "@zocomputer/agent-sdk";

// Delivers what queues up while the session is parked as a real user turn on
// the next park: images the `read` tool encountered (eve tool results are
// text/json only, so the pixels can't ride the result itself) and
// background-task notifications (bash/run_async `notify` watcher matches,
// completion notices). Runs server-side inside the agent process — no client
// needed. `serverUrl` defaults to loopback on $PORT (eve dev's 2000 otherwise).
export default createParkDeliveryHook();
