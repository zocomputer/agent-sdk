import { disableTool } from "eve/tools";

// Vacate eve's built-in `web_fetch` so the model sees only our `webfetch`. eve
// injects every built-in whose name isn't overridden or disabled.
export default disableTool();
