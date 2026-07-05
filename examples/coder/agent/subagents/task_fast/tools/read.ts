import { taskChildTools } from "../lib/child-tools";

// NOT the parent's read: children run without the park-delivery hook, so the
// parent's attachment-enabled instance would promise image bytes that never
// arrive. This child-safe instance returns media as metadata with honest
// hints (see ../lib/child-tools.ts); manifest.test.ts pins the split.
export default taskChildTools.read;
