import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { relativizeWithin, resolveWithin } from "./workspace";

const root = resolve("/repo");

test("resolves a relative path against the root", () => {
  expect(resolveWithin(root, "agent/agent.ts")).toBe(resolve(root, "agent/agent.ts"));
});

test("allows the root itself", () => {
  expect(resolveWithin(root, ".")).toBe(root);
});

test("allows an absolute path inside the root", () => {
  const inside = resolve(root, "a/b.ts");
  expect(resolveWithin(root, inside)).toBe(inside);
});

test("rejects a relative path that escapes via ..", () => {
  expect(() => resolveWithin(root, "../secrets.txt")).toThrow(/escapes the workspace root/);
});

test("rejects an absolute path outside the root", () => {
  expect(() => resolveWithin(root, "/etc/hosts")).toThrow(/escapes the workspace root/);
});

test("rejects a sibling directory that shares a name prefix", () => {
  // /repo-evil must not be read as inside /repo.
  expect(() => resolveWithin(root, resolve("/repo-evil/x"))).toThrow(/escapes the workspace root/);
});

test("relativizeWithin returns a forward-slash, root-relative path", () => {
  expect(relativizeWithin(root, resolve(root, "a/b.ts"))).toBe("a/b.ts");
  expect(relativizeWithin(root, root)).toBe(".");
});
