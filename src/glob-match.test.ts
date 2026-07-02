import { expect, test } from "bun:test";
import { globToRegExp } from "./glob-match";

const matches = (glob: string, path: string): boolean => globToRegExp(glob).test(path);

test("* matches within a single segment only", () => {
  expect(matches("*.ts", "a.ts")).toBe(true);
  expect(matches("*.ts", "dir/a.ts")).toBe(false);
});

test("**/ spans any number of directories", () => {
  expect(matches("**/*.ts", "a.ts")).toBe(true);
  expect(matches("**/*.ts", "a/b/c.ts")).toBe(true);
  expect(matches("**/*.ts", "a/b/c.tsx")).toBe(false);
});

test("literal directory segments are anchored", () => {
  expect(matches("agent/tools/*.ts", "agent/tools/bash.ts")).toBe(true);
  expect(matches("agent/tools/*.ts", "agent/lib/bash.ts")).toBe(false);
  expect(matches("agent/tools/*.ts", "x/agent/tools/bash.ts")).toBe(false);
});

test("? matches exactly one non-separator char", () => {
  expect(matches("a?.ts", "ab.ts")).toBe(true);
  expect(matches("a?.ts", "a.ts")).toBe(false);
  expect(matches("a?.ts", "a/.ts")).toBe(false);
});

test("regex metacharacters are treated literally", () => {
  expect(matches("a.b+c.ts", "a.b+c.ts")).toBe(true);
  expect(matches("a.b+c.ts", "aXbXc.ts")).toBe(false); // '.' is not a wildcard
});

test("the match is fully anchored", () => {
  expect(matches("*.ts", "a.ts.map")).toBe(false);
});
