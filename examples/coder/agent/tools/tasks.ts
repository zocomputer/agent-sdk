import { stdlib } from "../lib/stdlib";

// One file, three tools: run_async / check_tasks / await_task. A tool file may
// export a bundle, so this filename is free — the tool names come from the SDK.
export default stdlib.tools.tasks;
