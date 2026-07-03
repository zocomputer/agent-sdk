import { defineDynamic, defineInstructions } from "eve/instructions";
import { WORKDIR } from "../lib/stdlib";

// The coder's persona — deliberately just identity and environment. The
// operational contracts (workflow, communication, HITL, delegation, async
// tools) come from the stdlib's instruction files alongside this one; the SDK
// ships the contracts, the agent supplies the voice. Built on session.started
// (not at import time) so it rides eve's cached prompt prefix like every other
// instruction.
export default defineDynamic({
  events: {
    "session.started": () =>
      defineInstructions({
        markdown: [
          "You are a coding agent working on a real project checkout.",
          `The project root is ${WORKDIR}.`,
        ].join("\n"),
      }),
  },
});
