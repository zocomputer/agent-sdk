// External-state declarations — the `agent/state/<name>.ts` file-per-capability
// convention from plans/dcosson/external-state.md. A declaration names what the
// agent's code depends on (interface, access, the author's visibility intent);
// which engine/store actually serves it is bound by the Zo control plane, never
// declared here. eve has no `state` discovery slot, so discovery is Zo-built end
// to end: deploy validation extracts the declaration with a strict literal
// parser (apps/api/src/state/declaration-parse.ts), which is why the argument to
// `defineExternalState` must stay a statically analyzable literal — no spreads,
// no computed values, no identifiers. The runtime (`@zo/state`, later) imports
// the module and reads the same object.

/** What the agent's code programs against. A small, closed, slowly growing set. */
export type StateInterface = "files" | "sql" | "kv" | "http" | "exec";

/** Read-only or read-write, as the code needs. */
export type StateAccess = "r" | "rw";

/**
 * The visibility model the author designed for. Drives the zero-config default
 * and consent copy; never a constraint — the data's owner can override it.
 */
export type StateIntent = "private" | "shared";

/** How instances subdivide. There is deliberately no `turn` (use eve's defineState). */
export type StatePartition = "none" | "team" | "user" | "session";

/**
 * The author's preferred engine/partition/lifecycle, consumed at rung two of
 * the binding resolution ladder. Hints, not constraints.
 */
export interface SuggestedStateDefaults {
  /** Engine catalog key, e.g. "zo-blob-r2". Free-form: the catalog is control-plane code. */
  readonly engine?: string;
  readonly partition?: StatePartition;
  /** Per-transition lifecycle overrides on the (engine, partition) defaults. */
  readonly lifecycle?: Readonly<Record<string, string | number | boolean>>;
}

export interface ExternalStateDeclaration {
  /**
   * What tools reference at runtime. Must equal the declaring filename
   * (`agent/state/<name>.ts`) — deploy validation enforces the match, which
   * also makes duplicate names structurally impossible.
   */
  readonly name: string;
  readonly interface: StateInterface;
  readonly access: StateAccess;
  readonly intent: StateIntent;
  readonly suggestedDefaults?: SuggestedStateDefaults;
}

/** Mirrors the deploy parser's name rule: lowercase, digit/underscore/hyphen tail. */
export const STATE_NAME_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;

const INTERFACES: readonly StateInterface[] = ["files", "sql", "kv", "http", "exec"];
const ACCESSES: readonly StateAccess[] = ["r", "rw"];
const INTENTS: readonly StateIntent[] = ["private", "shared"];
const PARTITIONS: readonly StatePartition[] = ["none", "team", "user", "session"];

/**
 * The declaration helper an agent default-exports from `agent/state/<name>.ts`.
 * Validates eagerly so a bad declaration fails at module load in local dev, not
 * first at deploy; deploy validation re-checks the source statically regardless
 * (it never executes agent code).
 */
export function defineExternalState(
  declaration: ExternalStateDeclaration,
): ExternalStateDeclaration {
  if (!STATE_NAME_PATTERN.test(declaration.name)) {
    throw new Error(
      `external-state declaration name "${declaration.name}" must match ${STATE_NAME_PATTERN} and equal the declaring filename`,
    );
  }
  if (!INTERFACES.includes(declaration.interface)) {
    throw new Error(
      `external-state declaration "${declaration.name}": unknown interface "${String(declaration.interface)}" (expected ${INTERFACES.join(" | ")})`,
    );
  }
  if (!ACCESSES.includes(declaration.access)) {
    throw new Error(
      `external-state declaration "${declaration.name}": unknown access "${String(declaration.access)}" (expected ${ACCESSES.join(" | ")})`,
    );
  }
  if (!INTENTS.includes(declaration.intent)) {
    throw new Error(
      `external-state declaration "${declaration.name}": unknown intent "${String(declaration.intent)}" (expected ${INTENTS.join(" | ")})`,
    );
  }
  const partition = declaration.suggestedDefaults?.partition;
  if (partition !== undefined && !PARTITIONS.includes(partition)) {
    throw new Error(
      `external-state declaration "${declaration.name}": unknown suggested partition "${String(partition)}" (expected ${PARTITIONS.join(" | ")})`,
    );
  }
  return Object.freeze(declaration);
}
