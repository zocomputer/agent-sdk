[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / STDLIB\_EXTERNAL\_DEPENDENCIES

# Variable: STDLIB\_EXTERNAL\_DEPENDENCIES

> `const` **STDLIB\_EXTERNAL\_DEPENDENCIES**: readonly `string`[]

Defined in: [packages/agent-sdk/src/build-externals.ts:37](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/build-externals.ts#L37)

The packages `@zocomputer/agent-sdk` pulls in at run time that an agent
should keep external while eve compiles its authored modules: the SDK's own
`dependencies` plus the `zod` peer. Pass them through `defineAgent`:

```ts title="agent/agent.ts"
import { STDLIB_EXTERNAL_DEPENDENCIES } from "@zocomputer/agent-sdk";

export default defineAgent({
  model: "anthropic/claude-opus-4.8",
  build: { externalDependencies: [...STDLIB_EXTERNAL_DEPENDENCIES] },
});
```

Declared subagents compile with their own manifest config, so pass the list
to each tier's `createTaskAgent({ build: ... })` as well. Append your
agent's other heavy direct imports to the spread. `eve` itself stays off
the list — the compiler always keeps framework imports external.

The agent app must also declare these packages in its own `dependencies`:
an externalized import stays a bare specifier in the compiled bundle, which
resolves from the app's `node_modules` — and under an isolating installer
(bun's isolated linker, pnpm) the SDK's transitive deps aren't reachable
from there. Mirror the versions this package pins.

Kept in sync with `package.json` by `build-externals.test.ts`.
