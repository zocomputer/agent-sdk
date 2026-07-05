import { createExploreTools } from "@zocomputer/agent-sdk";
import { WORKDIR } from "../../../lib/stdlib";

// One read-only toolset instance for the explore child, rooted at the same
// project as the parent (declared subagents don't share eve's sandbox, but
// these tools act on the host filesystem — WORKDIR — so the child sees the
// project the parent is asking about). Each tools/<name>.ts re-exports one
// tool from here; the filename is the wire name.
export const exploreTools = createExploreTools({
  workspaceRoot: WORKDIR,
  workspaceNoun: "project",
});
