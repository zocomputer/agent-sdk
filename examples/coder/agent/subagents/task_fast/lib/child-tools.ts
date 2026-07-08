import { createTaskChildTools } from "@zocomputer/agent-sdk";
import { stdlib, WORKDIR } from "../../../lib/stdlib";

// Child-safe read/webfetch for the task child. The parent's instances are
// attachment-enabled — they queue image bytes for the park-delivery hook to
// re-inject — but declared children run WITHOUT that hook (they never park
// awaiting input), so the parent's "queued as a viewable attachment" note
// would be a lie here. These disable attachments; with the media oracle
// wired, the hints route media to the child's `look` re-export instead of
// dead-ending at "report the path" — derived from the PARENT's resolved
// oracle (`stdlib.mediaOracle`), since the child's `look` is the parent's
// instance and the hints must describe the model it actually runs. Every
// other child tool stays a one-line re-export of the parent's instance
// (manifest.test.ts pins the split).
export const taskChildTools = createTaskChildTools({
  workspaceRoot: WORKDIR,
  workspaceNoun: "project",
  spillDir: stdlib.spillDir,
  ...(stdlib.mediaOracle !== null ? { mediaOracle: stdlib.mediaOracle } : {}),
});
