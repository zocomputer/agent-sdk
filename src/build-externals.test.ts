import { describe, expect, test } from "bun:test";
import packageJson from "../package.json";
import { STDLIB_EXTERNAL_DEPENDENCIES } from "./build-externals";

describe("STDLIB_EXTERNAL_DEPENDENCIES", () => {
  test("is exactly the package's runtime dependencies plus the zod peer", () => {
    const runtimeDeps = Object.keys(packageJson.dependencies);
    expect([...STDLIB_EXTERNAL_DEPENDENCIES].sort()).toEqual(
      [...runtimeDeps, "zod"].sort(),
    );
  });

  test("never lists eve — the compiler already externalizes framework imports", () => {
    expect(STDLIB_EXTERNAL_DEPENDENCIES).not.toContain("eve");
  });
});
