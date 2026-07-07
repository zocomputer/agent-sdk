import { isAbsolute, relative, resolve, sep } from "node:path";

// Every file tool resolves paths against one root and refuses anything that
// escapes it — an agent is scoped to the workspace it was launched in. `bash`
// is deliberately not confined this way (it's a real shell); the file tools are.

/**
 * Resolve `path` against `root` and refuse anything that escapes it. Relative
 * paths resolve from `root`; an absolute path must already sit inside it.
 */
export function resolveWithin(root: string, path: string): string {
  const abs = isAbsolute(path) ? resolve(path) : resolve(root, path);
  // `root + sep` (not bare `root`) so a sibling like `/repo-evil` isn't read as
  // inside `/repo`.
  if (abs !== root && !abs.startsWith(root + sep)) {
    throw new Error(`Path escapes the workspace root (${root}): ${path}`);
  }
  return abs;
}

/** A root-relative, forward-slash path for display. Pure counterpart to resolveWithin. */
export function relativizeWithin(root: string, abs: string): string {
  const rel = relative(root, abs);
  return rel === "" ? "." : rel.split(sep).join("/");
}

/** One workspace root plus the two path operations every file tool needs. */
export interface Workspace {
  readonly root: string;
  /** Resolve a path against the workspace root and refuse anything that escapes it. */
  resolve(path: string): string;
  /** Turn an absolute path into a root-relative, forward-slash display path. */
  relativize(abs: string): string;
}

/** Build a Workspace bound to one root directory. */
export function createWorkspace(root: string): Workspace {
  const abs = resolve(root);
  return {
    root: abs,
    resolve: (path) => resolveWithin(abs, path),
    relativize: (path) => relativizeWithin(abs, path),
  };
}
