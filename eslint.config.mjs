// Self-contained on purpose — no `@zocomputer/eslint-config` import, for the
// same reason tsconfig.json inlines the shared base instead of extending it:
// rib consumes this package via `file:` from outside the workspace, and its
// standalone `bun install` can't resolve workspace-only protocols, so devDeps
// stay concrete published packages.
//
// Scope is deliberately narrow: the TSDoc docs contract only (tsdoc/syntax
// validates every `/** */` comment against the TSDoc grammar). Adopting the
// repo-wide strict-type-checked policy here is a separate decision.
import tsdoc from "eslint-plugin-tsdoc";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // The examples are standalone projects with their own installs, not part
    // of this package's lint surface.
    ignores: ["examples/**"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { tsdoc },
    rules: { "tsdoc/syntax": "error" },
  },
);
