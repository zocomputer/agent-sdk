import { stdlib } from "../lib/stdlib";

// Delegation playbook for eve's built-in `agent` tool (a clone of this agent):
// context-packing, parallel fan-out, non-overlapping write scopes.
export default stdlib.instructions.subagents;
