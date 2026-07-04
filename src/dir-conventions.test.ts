import { afterEach, describe, expect, test } from "bun:test";
import { join, sep } from "node:path";
import {
  __resetDirConventionsCacheForTests,
  createDirConventionsTracker,
  dirChain,
  type DirConventionsRider,
} from "./dir-conventions";

afterEach(() => __resetDirConventionsCacheForTests());

const ROOT = sep === "/" ? "/ws" : "C:\\ws";

/** Tracker over an in-memory file map (workspace-relative AGENTS.md paths). */
function tracker(
  files: Record<string, string>,
  opts?: { maxBytesPerFile?: number; maxFilesPerRead?: number; fileName?: string },
) {
  return createDirConventionsTracker({
    workspaceRoot: ROOT,
    loadFile: (abs) => {
      const rel = abs.startsWith(ROOT + sep) ? abs.slice(ROOT.length + 1) : abs;
      return files[rel] ?? null;
    },
    ...opts,
  });
}

function contentPaths(riders: DirConventionsRider[]): string[] {
  return riders.filter((r) => "content" in r).map((r) => r.path);
}

describe("dirChain", () => {
  test("walks shallow to deep, excluding the root and the file", () => {
    expect(dirChain(join("a", "b", "c", "f.ts"))).toEqual([
      "a",
      join("a", "b"),
      join("a", "b", "c"),
    ]);
  });

  test("a root-level file has no chain", () => {
    expect(dirChain("f.ts")).toEqual([]);
  });

  test("accepts backslash separators and returns forward-slash entries", () => {
    expect(dirChain("a\\b\\c\\f.ts")).toEqual(["a", "a/b", "a/b/c"]);
    expect(dirChain("a\\b/c\\f.ts")).toEqual(["a", "a/b", "a/b/c"]);
  });
});

describe("createDirConventionsTracker", () => {
  const files = {
    [join("apps", "AGENTS.md")]: "# apps conventions",
    [join("apps", "web", "AGENTS.md")]: "# web conventions",
  };

  test("first read under a dir delivers the chain, shallow to deep", async () => {
    const t = tracker(files);
    const riders = await t.collect("s1", join("apps", "web", "page.tsx"));
    expect(riders).toEqual([
      { path: join("apps", "AGENTS.md"), content: "# apps conventions" },
      { path: join("apps", "web", "AGENTS.md"), content: "# web conventions" },
    ]);
  });

  test("second read under the same dirs delivers nothing", async () => {
    const t = tracker(files);
    await t.collect("s1", join("apps", "web", "page.tsx"));
    expect(await t.collect("s1", join("apps", "web", "layout.tsx"))).toEqual([]);
  });

  test("a deeper read delivers only the undelivered suffix of the chain", async () => {
    const t = tracker(files);
    await t.collect("s1", join("apps", "readme.txt"));
    const riders = await t.collect("s1", join("apps", "web", "page.tsx"));
    expect(contentPaths(riders)).toEqual([join("apps", "web", "AGENTS.md")]);
  });

  test("the root conventions file is never delivered", async () => {
    const t = tracker({ "AGENTS.md": "# root", ...files });
    const riders = await t.collect("s1", join("apps", "web", "page.tsx"));
    expect(contentPaths(riders)).not.toContain("AGENTS.md");
  });

  test("sessions are independent", async () => {
    const t = tracker(files);
    await t.collect("s1", join("apps", "web", "page.tsx"));
    const riders = await t.collect("s2", join("apps", "web", "page.tsx"));
    expect(riders).toHaveLength(2);
  });

  test("no session id → no riders, no tracking", async () => {
    const t = tracker(files);
    expect(await t.collect(undefined, join("apps", "web", "page.tsx"))).toEqual([]);
    // The undefined call must not have marked anything delivered.
    expect(await t.collect("s1", join("apps", "web", "page.tsx"))).toHaveLength(2);
  });

  test("reading the conventions file itself delivers it silently", async () => {
    const t = tracker(files);
    const riders = await t.collect("s1", join("apps", "AGENTS.md"));
    expect(riders).toEqual([]);
    // Later reads under apps/ don't re-deliver what the model just read.
    expect(contentPaths(await t.collect("s1", join("apps", "web", "x.ts")))).toEqual([
      join("apps", "web", "AGENTS.md"),
    ]);
  });

  test("missing and empty conventions files are skipped", async () => {
    const t = tracker({ [join("a", "AGENTS.md")]: "  \n" });
    expect(await t.collect("s1", join("a", "b", "f.ts"))).toEqual([]);
  });

  test("an oversized file becomes a pointer note", async () => {
    const t = tracker(
      { [join("a", "AGENTS.md")]: "x".repeat(100) },
      { maxBytesPerFile: 10 },
    );
    const riders = await t.collect("s1", join("a", "f.ts"));
    expect(riders).toHaveLength(1);
    const rider = riders[0];
    if (rider === undefined || !("note" in rider)) throw new Error("expected a note rider");
    expect(rider.note).toContain(join("a", "AGENTS.md"));
  });

  test("overflow beyond maxFilesPerRead inlines the dirs nearest the file", async () => {
    const deep = {
      [join("a", "AGENTS.md")]: "A",
      [join("a", "b", "AGENTS.md")]: "B",
      [join("a", "b", "c", "AGENTS.md")]: "C",
    };
    const t = tracker(deep, { maxFilesPerRead: 2 });
    const riders = await t.collect("s1", join("a", "b", "c", "f.ts"));
    expect(riders).toHaveLength(3);
    expect(contentPaths(riders)).toEqual([
      join("a", "b", "AGENTS.md"),
      join("a", "b", "c", "AGENTS.md"),
    ]);
    const shallow = riders[0];
    if (shallow === undefined || !("note" in shallow)) throw new Error("expected a note rider");
    expect(shallow.note).toContain(join("a", "AGENTS.md"));
  });

  test("custom conventions filename", async () => {
    const t = tracker(
      { [join("a", "CLAUDE.md")]: "# claude" },
      { fileName: "CLAUDE.md" },
    );
    expect(await t.collect("s1", join("a", "f.ts"))).toEqual([
      { path: join("a", "CLAUDE.md"), content: "# claude" },
    ]);
  });

  test("backslash reads normalize: riders are /-joined and dedupe against slash reads", async () => {
    const t = tracker(files);
    const riders = await t.collect("s1", "apps\\web\\page.tsx");
    expect(riders.map((r) => r.path)).toEqual(["apps/AGENTS.md", "apps/web/AGENTS.md"]);
    // The same dirs read with forward slashes are already delivered.
    expect(await t.collect("s1", "apps/web/layout.tsx")).toEqual([]);
  });

  test("reading the conventions file itself via backslashes still suppresses the rider", async () => {
    const t = tracker(files);
    expect(await t.collect("s1", "apps\\AGENTS.md")).toEqual([]);
  });

  test("LRU eviction spares recently active sessions", async () => {
    const t = tracker(files);
    await t.collect("s1", "apps/web/page.tsx");
    // 99 other sessions fill the cache behind s1…
    for (let i = 0; i < 99; i++) await t.collect(`filler-${i}`, "apps/web/page.tsx");
    // …then s1 is touched again, making filler-0 the LRU victim when the
    // 101st session arrives.
    expect(await t.collect("s1", "apps/web/other.tsx")).toEqual([]);
    await t.collect("one-more", "apps/web/page.tsx");
    // s1 kept its delivered state; the evicted filler re-delivers.
    expect(await t.collect("s1", "apps/web/again.tsx")).toEqual([]);
    expect(await t.collect("filler-0", "apps/web/page.tsx")).toHaveLength(2);
  });

  test("maxSessions overrides the eviction cap", async () => {
    const t = createDirConventionsTracker({
      workspaceRoot: ROOT,
      maxSessions: 2,
      loadFile: (abs) => {
        const rel = abs.startsWith(ROOT + sep) ? abs.slice(ROOT.length + 1) : abs;
        return files[rel] ?? null;
      },
    });
    await t.collect("a", "apps/web/page.tsx");
    await t.collect("b", "apps/web/page.tsx");
    await t.collect("c", "apps/web/page.tsx"); // evicts "a"
    expect(await t.collect("a", "apps/web/page.tsx")).toHaveLength(2);
  });

  test("a throwing loader leaves the slot unconsumed; the next read retries", async () => {
    const t = tracker(files);
    let fail = true;
    const flaky = (abs: string): string | null => {
      if (fail) throw new Error("transient sandbox error");
      const rel = abs.startsWith(ROOT + sep) ? abs.slice(ROOT.length + 1) : abs;
      return files[rel] ?? null;
    };
    // Failed loads deliver nothing and must not mark the dirs delivered.
    expect(await t.collect("s1", join("apps", "web", "page.tsx"), flaky)).toEqual([]);
    // The loader recovers: the same session gets the full chain.
    fail = false;
    const riders = await t.collect("s1", join("apps", "web", "layout.tsx"), flaky);
    expect(contentPaths(riders)).toEqual([
      join("apps", "AGENTS.md"),
      join("apps", "web", "AGENTS.md"),
    ]);
  });

  test("concurrent first reads deliver a dir's conventions at most once", async () => {
    // Two reads race into the same directory; the loader parks both until
    // released, so both are past the delivered check's synchronous window.
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const t = tracker({});
    const slow = async (abs: string): Promise<string | null> => {
      await gate;
      const rel = abs.startsWith(ROOT + sep) ? abs.slice(ROOT.length + 1) : abs;
      return files[rel] ?? null;
    };
    const a = t.collect("s1", join("apps", "web", "page.tsx"), slow);
    const b = t.collect("s1", join("apps", "web", "layout.tsx"), slow);
    release();
    const [ridersA, ridersB] = await Promise.all([a, b]);
    const delivered = [...contentPaths(ridersA), ...contentPaths(ridersB)];
    expect(new Set(delivered).size).toBe(delivered.length);
    expect(delivered.sort()).toEqual([
      join("apps", "AGENTS.md"),
      join("apps", "web", "AGENTS.md"),
    ]);
  });

  test("a missing conventions file is a settled answer — the dir never re-probes", async () => {
    const probes: string[] = [];
    const t = tracker({});
    const counting = (abs: string): string | null => {
      probes.push(abs);
      return null;
    };
    await t.collect("s1", join("a", "f.ts"), counting);
    await t.collect("s1", join("a", "g.ts"), counting);
    expect(probes).toHaveLength(1);
  });

  test("trackers over the same root share delivered state (rebuild dedupe)", async () => {
    const a = tracker(files);
    await a.collect("s1", join("apps", "web", "page.tsx"));
    // A second tracker instance — as after eve's mid-session module-graph
    // rebuild — must not re-deliver.
    const b = tracker(files);
    expect(await b.collect("s1", join("apps", "web", "page.tsx"))).toEqual([]);
  });

  // Property test (URP): over random trees and read sequences, every
  // conventions file except the root's is delivered exactly once per session,
  // and only when a read actually passes under its directory.
  test("property: exactly-once delivery, only for dirs read under", async () => {
    let seed = 0xdecafbad;
    const rand = () => {
      // xorshift32 — deterministic across runs.
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 0xffffffff;
    };
    const pick = <T>(xs: readonly T[]): T => {
      const x = xs[Math.floor(rand() * xs.length)];
      if (x === undefined) throw new Error("pick from empty list");
      return x;
    };

    for (let round = 0; round < 25; round++) {
      // Random dir tree: paths of depth 1–4 over a small segment alphabet.
      const segments = ["a", "b", "c"];
      const dirs = new Set<string>();
      for (let i = 0; i < 8; i++) {
        const depth = 1 + Math.floor(rand() * 4);
        const parts: string[] = [];
        for (let d = 0; d < depth; d++) parts.push(pick(segments));
        for (let d = 1; d <= parts.length; d++) dirs.add(parts.slice(0, d).join(sep));
      }
      // Each dir has a conventions file with probability 1/2; root sometimes too.
      const files: Record<string, string> = {};
      if (rand() < 0.5) files["AGENTS.md"] = "root";
      for (const dir of dirs) {
        if (rand() < 0.5) files[join(dir, "AGENTS.md")] = `conventions of ${dir}`;
      }
      const t = tracker(files);

      // Random read sequence; track deliveries and which dirs were read under.
      const deliveredPaths: string[] = [];
      const readUnder = new Set<string>();
      const dirList = [...dirs];
      for (let i = 0; i < 30; i++) {
        const dir = pick(dirList);
        const relPath = join(dir, `file${Math.floor(rand() * 3)}.ts`);
        for (const d of dirChain(relPath)) readUnder.add(d);
        for (const rider of await t.collect(`round-${round}`, relPath)) {
          if ("content" in rider) deliveredPaths.push(rider.path);
        }
      }

      // Exactly once: no duplicate delivery.
      expect(new Set(deliveredPaths).size).toBe(deliveredPaths.length);
      // Never the root file.
      expect(deliveredPaths).not.toContain("AGENTS.md");
      // Only for dirs actually read under — and every such dir with a
      // conventions file was delivered.
      const expected = [...readUnder]
        .filter((dir) => files[join(dir, "AGENTS.md")] !== undefined)
        .map((dir) => join(dir, "AGENTS.md"))
        .sort();
      expect([...deliveredPaths].sort()).toEqual(expected);
      __resetDirConventionsCacheForTests();
    }
  });
});
