// Convert a glob to an anchored RegExp over forward-slash paths. `**` (or `**/`)
// spans any number of directories; `*` matches within a single segment; `?` one
// non-separator char. Pure and dependency-free so `glob`, `grep`, and their
// tests all share one matcher.
export function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const body = escaped
    .replace(/\*\*\/?/g, "\u0000") // placeholder for "any dirs"
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\u0000/g, "(?:.*/)?");
  return new RegExp(`^${body}$`);
}
