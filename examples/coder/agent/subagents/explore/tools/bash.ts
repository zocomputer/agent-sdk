import { disableTool } from "eve/tools";

// The explore child is read-only by construction: a declared subagent with no
// authored tool at this name would fall back to eve's FRAMEWORK bash — full
// write capability. Every entry in EXPLORE_DISABLED_BUILTINS gets a shim like
// this one; the SDK's example-coder manifest test fails if any is missing.
export default disableTool();
