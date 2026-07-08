import { createLookInstruction } from "@zocomputer/agent-sdk";
import { stdlib } from "../../../lib/stdlib";

// The media-delegation playbook for this child, built from the PARENT's
// resolved oracle (the child's `look` is the parent's instance, so the
// playbook must describe the model it actually runs) and deliberately
// WITHOUT parentCapabilities: a delegated child's read/webfetch are
// attach-disabled (no park-delivery hook), so no media is viewable inline
// here regardless of the tier model — a native-viewing claim would
// contradict the child's own read notes, which route media to `look`.
const oracle = stdlib.mediaOracle;
if (oracle === null) {
  throw new Error("stdlib must wire mediaOracle for the task child's media instruction");
}
export default createLookInstruction({
  modelName: oracle.modelName,
  capabilities: oracle.capabilities,
});
