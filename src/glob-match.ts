/** Convert a glob to an anchored RegExp over forward-slash paths. Double-star spans directories; single-star matches within a segment; question mark matches one char. */
export function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const body = escaped
    .replace(/\*\*\/?/g, "\u0000") // placeholder for "any dirs"
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\u0000/g, "(?:.*/)?");
  return new RegExp(`^${body}$`);
}
