import { disableTool } from "eve/tools";

// A parked child parks the parent's turn; an explorer that hits ambiguity
// reports it as its answer instead. See tools/bash.ts.
export default disableTool();
