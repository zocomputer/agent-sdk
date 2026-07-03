import { disableTool } from "eve/tools";

// Vacate eve's built-in `read_file` so the model sees only our `read`. eve
// injects every built-in whose name isn't overridden or disabled.
export default disableTool();
