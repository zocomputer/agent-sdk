import { createTaskInstruction } from "@zocomputer/agent-sdk";

// The task child's operating contract: final message is the whole
// deliverable, decide-don't-ask, stay in the assigned write scope, bound
// onward delegation. A declared subagent inherits no instructions from the
// root, so this plus the re-exports beside it is the child's entire prompt.
export default createTaskInstruction({ workspaceNoun: "project" });
