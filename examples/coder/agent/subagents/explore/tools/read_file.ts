import { disableTool } from "eve/tools";

// Vacated in favor of `read` (read.ts) — without the shim eve's sandbox
// builtin would resurrect alongside it. See tools/bash.ts.
export default disableTool();
