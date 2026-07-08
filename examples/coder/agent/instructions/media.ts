import { stdlib } from "../lib/stdlib";

// The media-delegation playbook for the look oracle: view natively what the
// session model supports, pass the rest to `look`. Session-scoped like every
// dynamic instruction — part of the cached prompt prefix.
const media = stdlib.instructions.media;
if (media === undefined) {
  throw new Error("stdlib must wire mediaOracle for the media instruction");
}
export default media;
