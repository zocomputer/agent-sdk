import { stdlib } from "../lib/stdlib";

// `bash` re-uses eve's built-in name, so this overrides it directly — no
// disable shim needed (unlike read_file/write_file).
export default stdlib.tools.bash;
