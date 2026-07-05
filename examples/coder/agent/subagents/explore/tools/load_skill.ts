import { disableTool } from "eve/tools";

// The explore child has no skills directory; vacate the loader so the tool
// surface stays exactly read/glob/grep. See tools/bash.ts.
export default disableTool();
