import { stdlib } from "../../../lib/stdlib";

// Root AGENTS.md for the explore child — declared subagents inherit no
// instructions, and an explorer without the project conventions misreads the
// layout it's reporting on. Nested AGENTS.md files still arrive as read
// riders (the explore toolset's `read` carries the dir-conventions tracker).
export default stdlib.instructions.repoConventions;
