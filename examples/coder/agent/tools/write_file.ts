import { disableTool } from "eve/tools";

// Vacate eve's built-in `write_file` in favor of our `write`.
export default disableTool();
