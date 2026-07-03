import { stdlib } from "../lib/stdlib";

// The filename is the wire name: the model calls this `read`. Same pattern for
// edit/write/glob/grep/bash below.
export default stdlib.tools.read;
