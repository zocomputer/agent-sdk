import { createExploreInstruction } from "@zocomputer/agent-sdk";

// The explore child's operating contract: read-only, final message is the
// whole deliverable, cite paths + line refs, honor the requested thoroughness.
// A declared subagent inherits no instructions from the root, so this plus
// repo-conventions.ts is its entire prompt.
export default createExploreInstruction({ workspaceNoun: "project" });
