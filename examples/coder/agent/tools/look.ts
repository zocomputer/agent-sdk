import { stdlib } from "../lib/stdlib";

// The media oracle: ask a pinned capable model (the SDK's default — Gemini 3
// Flash) one question about a media file the session model can't view. A
// plain tool call over the AI SDK, so it works in the task child too (which
// re-exports this instance).
const look = stdlib.tools.look;
if (look === undefined) {
  throw new Error("stdlib must wire mediaOracle for the look tool");
}
export default look;
