import { taskChildTools } from "../lib/child-tools";

// NOT the parent's webfetch: same attachment caveat as read.ts — fetched
// images degrade to metadata in a child session (no park-delivery hook).
export default taskChildTools.webfetch;
