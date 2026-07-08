// The externalization list for eve's authored-module compiles. eve bundles
// every authored module (each tool, hook, instruction, subagent) with rolldown,
// and by default that inlines this package's whole dependency graph — xlsx,
// mammoth, linkedom, and friends — into every bundle. Listing them in
// `defineAgent`'s `build.externalDependencies` keeps them as plain runtime
// imports instead, which cuts agent compile time by minutes on slow machines
// (CI runners) with no behavior change: the same modules load from
// node_modules at run time, and eve traces them into hosted build output.

/**
 * The packages `@zocomputer/agent-sdk` pulls in at run time that an agent
 * should keep external while eve compiles its authored modules: the SDK's own
 * `dependencies` plus the `zod` peer. Pass them through `defineAgent`:
 *
 * ```ts title="agent/agent.ts"
 * import { STDLIB_EXTERNAL_DEPENDENCIES } from "@zocomputer/agent-sdk";
 *
 * export default defineAgent({
 *   model: "anthropic/claude-opus-4.8",
 *   build: { externalDependencies: [...STDLIB_EXTERNAL_DEPENDENCIES] },
 * });
 * ```
 *
 * Declared subagents compile with their own manifest config, so pass the list
 * to each tier's `createTaskAgent({ build: ... })` as well. Append your
 * agent's other heavy direct imports to the spread. `eve` itself stays off
 * the list — the compiler always keeps framework imports external.
 *
 * The agent app must also declare these packages in its own `dependencies`:
 * an externalized import stays a bare specifier in the compiled bundle, which
 * resolves from the app's `node_modules` — and under an isolating installer
 * (bun's isolated linker, pnpm) the SDK's transitive deps aren't reachable
 * from there. Mirror the versions this package pins.
 *
 * Kept in sync with `package.json` by `build-externals.test.ts`.
 */
export const STDLIB_EXTERNAL_DEPENDENCIES: readonly string[] = [
  "ai",
  "clawpdf",
  "defuddle",
  "htmlparser2",
  "ignore",
  "image-size",
  "linkedom",
  "mammoth",
  "turndown",
  "xlsx",
  "zod",
];
