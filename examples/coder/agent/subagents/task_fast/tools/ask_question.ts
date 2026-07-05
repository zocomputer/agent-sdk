import { disableTool } from "eve/tools";

// Task children are autonomous: a parked child parks the PARENT's turn, so
// the contract is decide-and-report, never ask the user. Without this shim,
// the unauthored name would fall back to eve's FRAMEWORK ask_question (one
// shim per TASK_DISABLED_BUILTINS entry).
export default disableTool();
