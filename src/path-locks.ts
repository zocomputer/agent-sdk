// Per-path serialization for the mutating file tools (`edit`, `write`).
//
// eve runs a step's tool calls concurrently (`Promise.all`), so a model that
// batches two `edit` calls against the same file races them: both read the
// file, both compute their replacement from the same original text, and the
// second write silently discards the first edit — while both results report
// success. Serializing the whole read-modify-write critical section per
// absolute path makes batched same-file edits apply in call order instead:
// the second edit reads the first one's output, and if the first edit removed
// the second's `old_string`, the second fails loudly ("not found") instead of
// silently clobbering.
//
// The lock chain lives on `globalThis` (via `Symbol.for`) for the same reason
// as the task registry (see `async-tasks.ts`): eve's mid-session rebuild forks
// module-level state across module-graph copies, and two lock maps would
// serialize nothing.

const LOCKS_KEY = Symbol.for("zocomputer.agent-sdk.path-locks");

function lockChains(): Map<string, Promise<void>> {
  const holder = globalThis as { [LOCKS_KEY]?: Map<string, Promise<void>> };
  holder[LOCKS_KEY] ??= new Map();
  return holder[LOCKS_KEY];
}

/**
 * Run `fn` exclusively among all `withPathLock` calls for the same `path` in
 * this process. Callers queue FIFO; a thrown error releases the lock and
 * propagates without breaking the chain for later callers.
 */
export async function withPathLock<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const chains = lockChains();
  const prev = chains.get(path) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  // The stored chain resolves only when our critical section finishes, so the
  // next caller's `await prev` blocks until then. `gate` always resolves (in
  // the finally), so the chain never rejects and can't poison later callers.
  const chained = prev.then(() => gate);
  chains.set(path, chained);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    // Drop the entry once no later caller has chained onto us, so the map
    // doesn't grow with every path ever touched in a long session.
    if (chains.get(path) === chained) chains.delete(path);
  }
}
