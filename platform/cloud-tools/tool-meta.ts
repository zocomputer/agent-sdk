// The single source of truth for each built-in Zo cloud tool's user-facing
// metadata — today just its description. Consumed on BOTH sides of a gap the
// tool object can't bridge:
//   - the tool definition itself (`image.ts` reads its `description` from here), and
//   - `apps/api`'s definition parser, which shows a stored agent's tools in the
//     /build Settings tab. That parser reads tenant tool files as TEXT (it never
//     imports/executes them), and a built-in is seeded as a one-line re-export —
//     `export { default } from "./image.ts"` — that carries no
//     `description:` string of its own. It looks the built-in up here instead.
//
// Keyed by the tool's `@zocomputer/cloud-tools/<key>` subpath segment (the seed's
// re-export target), NOT the wire name the model sees (the tool file's name, e.g.
// `generate_image`). Keep this module import-light — no `ai`/`eve`/`zod`/runtime —
// so `apps/api` can import it without pulling the agent-runtime deps into its bundle.
export const CLOUD_TOOL_META = {
  image: {
    description: "Generate an image from a text prompt and save it as an external state asset.",
  },
  video: {
    description: "Generate a short video from a text prompt and save it as an external state asset.",
  },
} as const;

export type CloudToolName = keyof typeof CLOUD_TOOL_META;
export type CloudToolMeta = (typeof CLOUD_TOOL_META)[CloudToolName];

/**
 * Metadata for a built-in cloud tool by its `@zocomputer/cloud-tools/<key>`
 * subpath segment, or `null` for an unknown key — the checked lookup callers
 * use to resolve an arbitrary (untrusted) string against the map. The `as
 * CloudToolName` is proven safe by the preceding `in` guard and isolated here.
 */
export function cloudToolMeta(key: string): CloudToolMeta | null {
  return key in CLOUD_TOOL_META ? CLOUD_TOOL_META[key as CloudToolName] : null;
}
