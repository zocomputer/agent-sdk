import { stdlib } from "../lib/stdlib";

// Injects the project's root AGENTS.md into the system prompt (eve doesn't read
// it natively). Harmless no-op if the project has none.
export default stdlib.instructions.repoConventions;
