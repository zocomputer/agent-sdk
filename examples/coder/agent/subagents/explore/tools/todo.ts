import { disableTool } from "eve/tools";

// A one-question child needs no durable task list; keeping the tool surface
// at exactly read/glob/grep keeps the instruction literally true.
// See tools/bash.ts.
export default disableTool();
