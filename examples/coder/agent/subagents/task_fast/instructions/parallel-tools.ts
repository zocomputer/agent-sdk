import { stdlib } from "../../../lib/stdlib";

// Async-tool guidance — the child re-exports the parent's task toolset, so it
// needs the matching playbook too.
export default stdlib.instructions.parallelTools;
