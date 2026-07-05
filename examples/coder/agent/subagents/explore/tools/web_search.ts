import { disableTool } from "eve/tools";

// Exploration is project-local; no web keeps the child's blast radius at zero.
// See tools/bash.ts.
export default disableTool();
