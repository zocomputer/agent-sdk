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
    throw new Error(
      `Path escapes the workspace root (${root}): ${path}. File tools only reach inside the workspace — use a root-relative path, or bash for anything outside it.`,
    );
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

function isWithin(root: string, path: string): boolean {
  return path === root || path.startsWith(root + sep);
}

/**
 * Build a read-only path resolver with one workspace root plus explicit
 * absolute roots. Relative paths still resolve from the workspace. Consumers
 * must use this only for read surfaces; edit/write keep `createWorkspace`.
 */
export function createReadWorkspace(
  root: string,
  additionalRoots: readonly string[],
): Workspace {
  const primary = resolve(root);
  const readableRoots = [
    primary,
    ...additionalRoots.map((candidate) => resolve(candidate)),
  ].filter((candidate, index, roots) => roots.indexOf(candidate) === index);

  return {
    root: primary,
    resolve(path) {
      const abs = isAbsolute(path) ? resolve(path) : resolve(primary, path);
      if (!readableRoots.some((candidate) => isWithin(candidate, abs))) {
        throw new Error(
          `Path escapes the readable roots (${readableRoots.join(", ")}): ${path}. ` +
            "Use a path inside the workspace or an allowed read-only root.",
        );
      }
      return abs;
    },
    relativize(path) {
      const abs = resolve(path);
      return isWithin(primary, abs) ? relativizeWithin(primary, abs) : abs;
    },
  };
}
