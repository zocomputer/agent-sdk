// Stat-validated memo for document extraction. Paging through a long PDF
// re-runs `read_file` with a new offset each call; without this, every page
// of the window re-extracts the whole document. Keyed by path, validated by
// mtime+size, insertion-ordered LRU. Failures are not cached: `compute`
// throwing stores nothing, so a corrupt file is re-tried after it's fixed.

export interface StatIdentity {
  readonly mtimeMs: number;
  readonly size: number;
}

export interface StatCache<T> {
  get(key: string, id: StatIdentity, compute: () => Promise<T>): Promise<T>;
  /** Current entry count, for tests. */
  size(): number;
}

export function createStatCache<T>(limit: number): StatCache<T> {
  const entries = new Map<string, { id: StatIdentity; value: T }>();
  return {
    async get(key, id, compute) {
      const hit = entries.get(key);
      if (hit !== undefined && hit.id.mtimeMs === id.mtimeMs && hit.id.size === id.size) {
        // Refresh recency: Map iteration order is insertion order.
        entries.delete(key);
        entries.set(key, hit);
        return hit.value;
      }
      const value = await compute();
      entries.delete(key);
      entries.set(key, { id, value });
      if (entries.size > limit) {
        const oldest = entries.keys().next();
        if (!oldest.done) entries.delete(oldest.value);
      }
      return value;
    },
    size: () => entries.size,
  };
}
