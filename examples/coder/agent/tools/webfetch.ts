import { stdlib } from "../lib/stdlib";

// Web fetch under the opencode name `webfetch` (eve's `web_fetch` is disabled
// in web_fetch.ts): URL → markdown by default, oversized pages spill to the
// state dir, fetched PDFs/spreadsheets extract to text, images attach.
export default stdlib.tools.webfetch;
