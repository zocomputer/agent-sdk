import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { walkFiles } from "./walk";

const dir = mkdtempSync(join(tmpdir(), "rib-walk-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function write(rel: string, content = "x\n"): void {
  const abs = join(dir, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content);
}

write(".gitignore", ".rib/\n.verify-artifacts/\ndist/\n*.log\n");
write("a.ts");
write("sub/b.ts");
write("sub/trace.log");
write("node_modules/pkg/index.js");
write(".jj/store/x");
write(".rib/rib.db");
write(".verify-artifacts/shot.webp");
write("dist/out.js");
write("pkg/.gitignore", "generated/\n");
write("pkg/keep.ts");
write("pkg/generated/gen.ts");

test("walks recursively, yielding base-relative forward-slash paths", () => {
  const files = [...walkFiles(dir, dir)].sort();
  expect(files).toEqual([".gitignore", "a.ts", "pkg/.gitignore", "pkg/keep.ts", "sub/b.ts"]);
});

test("honors root .gitignore for dirs and files", () => {
  const files = [...walkFiles(dir, dir)];
  for (const skipped of [".rib", ".verify-artifacts", "dist"]) {
    expect(files.some((f) => f.startsWith(`${skipped}/`))).toBe(false);
  }
  expect(files).not.toContain("sub/trace.log");
});

test("honors a nested .gitignore in the dir that holds it", () => {
  const files = [...walkFiles(dir, dir)];
  expect(files).toContain("pkg/keep.ts");
  expect(files).not.toContain("pkg/generated/gen.ts");
});

test("always skips VCS stores and node_modules, even with no .gitignore", () => {
  const bare = mkdtempSync(join(tmpdir(), "rib-walk-bare-"));
  try {
    for (const rel of ["keep.ts", ".git/config", ".jj/store/x", "node_modules/pkg/index.js"]) {
      const abs = join(bare, rel);
      mkdirSync(join(abs, ".."), { recursive: true });
      writeFileSync(abs, "x\n");
    }
    expect([...walkFiles(bare, bare)].sort()).toEqual(["keep.ts"]);
  } finally {
    rmSync(bare, { recursive: true, force: true });
  }
});

test("scoped walk still applies ancestor .gitignore patterns", () => {
  // Walk pkg/ with base at the root: the root .gitignore's *.log and the
  // nested pkg/.gitignore's generated/ both apply.
  write("pkg/debug.log");
  const files = [...walkFiles(join(dir, "pkg"), dir)].sort();
  expect(files).toEqual(["pkg/.gitignore", "pkg/keep.ts"]);
});
