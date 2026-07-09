#!/usr/bin/env bun
/**
 * `bun run eval` — run the coder's deterministic mock-model eval suite through
 * eve's runner (`eve eval`). The suite is the SDK's end-to-end contract: the
 * example's prescribed wiring (stdlib tools, instructions, the task_fast
 * subagent, the park-delivery hook) driven through a REAL eve server, with
 * inference swapped for the SDK's scripted mock — credential-free, so it runs
 * in CI.
 *
 * What the wrapper does:
 *   - runs from an ISOLATED app-root copy (agent/ + manifests copied,
 *     node_modules symlinked, evals-mock/ mounted as evals/) so eve's
 *     per-app-root dev-server state never collides with a `bun dev` you have
 *     running, and a plain `eve eval` here can't accidentally point the
 *     [mock:*] prompts at a live model.
 *   - points CODER_WORKDIR at a throwaway temp dir, so nothing the agent does
 *     can touch a real project.
 *   - sets CODER_MOCK_MODEL=1 plus fast pacing knobs (the evals assert
 *     behavior, not streaming feel — every turn stays sub-second).
 *
 * `--suite <mock|compaction>` picks which eval tree mounts as `evals/`
 * (default `mock`). The `compaction` suite (`bun run eval:compaction`)
 * additionally shrinks the mock's context window (CODER_MOCK_WINDOW_TOKENS)
 * so eve's compaction fires mid-eval, and points
 * CODER_COMPACTION_REPORT_FILE at an NDJSON file in the app root so the
 * evals can assert on withValidatedCompaction's verdicts — knobs that would
 * wreck every multi-turn eval in the default suite, which is why the trees
 * are separate.
 *
 * All other args forward to `eve eval`: `bun run eval --list`,
 * `bun run eval hitl`, `bun run eval --tag hitl`, etc. Both temp trees are
 * removed on success and kept on failure for inspection.
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// eve's bin runs under the PATH `node` (its shebang) and hard-gates >=24, so
// check that binary — not this script's own runtime (under `bun run`,
// process.versions.node reports Bun's emulated version, not PATH node).
const nodeVersion = spawnSync("node", ["--version"], { encoding: "utf8" });
const nodeMajor = Number(/^v?(\d+)/.exec(nodeVersion.stdout?.trim() ?? "")?.[1]);
if (nodeVersion.error || !Number.isFinite(nodeMajor)) {
  console.error("Could not run `node --version` — eve needs Node >=24 on PATH.");
  process.exit(1);
}
if (nodeMajor < 24) {
  console.error(
    `Node ${nodeVersion.stdout.trim()} on PATH is too old for eve (needs >=24). Switch (e.g. \`nvm use 24\`) and retry.`,
  );
  process.exit(1);
}

const coderRoot = resolve(import.meta.dir, "..");
const eveBin = resolve(coderRoot, "node_modules", ".bin", "eve");

// `--suite <name>` picks the eval tree; everything else forwards to eve.
const argv = process.argv.slice(2);
const suiteFlag = argv.indexOf("--suite");
const suite = suiteFlag === -1 ? "mock" : (argv.splice(suiteFlag, 2)[1] ?? "");
if (suite !== "mock" && suite !== "compaction") {
  console.error(`Unknown --suite "${suite}" — expected "mock" or "compaction".`);
  process.exit(1);
}

// Isolated app root: agent/ + manifests copied, the suite's eval tree
// mounted as evals/. Created before the env block so the compaction suite's
// report file can live inside it (cleaned up / kept with the rest).
const appRoot = mkdtempSync(join(tmpdir(), "coder-evalroot-"));

const env = {
  ...process.env,
  CODER_MOCK_MODEL: "1",
  CODER_MOCK_CHUNKS: process.env.CODER_MOCK_CHUNKS ?? "12",
  CODER_MOCK_DELAY_MS: process.env.CODER_MOCK_DELAY_MS ?? "10",
  CODER_MOCK_BURST_CHUNKS: process.env.CODER_MOCK_BURST_CHUNKS ?? "80",
  // The compaction suite's forcing knobs: a 256-token window makes eve
  // compact between two ordinary turns (threshold = floor(256 * 0.9) = 230,
  // vs the mock's fixed 100 input tokens + a ~900-char story turn), and the
  // NDJSON report file is what the evals assert verdicts against.
  ...(suite === "compaction"
    ? {
        CODER_MOCK_WINDOW_TOKENS: process.env.CODER_MOCK_WINDOW_TOKENS ?? "256",
        CODER_COMPACTION_REPORT_FILE:
          process.env.CODER_COMPACTION_REPORT_FILE ??
          join(appRoot, "compaction-report.ndjson"),
      }
    : {}),
};

cpSync(resolve(coderRoot, `evals-${suite}`), join(appRoot, "evals"), { recursive: true });
for (const entry of ["agent", "package.json", "tsconfig.json"]) {
  cpSync(resolve(coderRoot, entry), join(appRoot, entry), { recursive: true });
}
symlinkSync(resolve(coderRoot, "node_modules"), join(appRoot, "node_modules"));

// Throwaway agent workspace: the evals never read project files, but the
// stdlib roots itself (and its .coder state dir) somewhere — keep it disposable.
const workdir = mkdtempSync(join(tmpdir(), "coder-evalwork-"));
console.error(`coder eval (${suite} suite) — app root ${appRoot}, workspace ${workdir}`);

const child = spawnSync(eveBin, ["eval", ...argv], {
  cwd: appRoot,
  stdio: "inherit",
  env: { ...env, CODER_WORKDIR: workdir },
});
const code = child.signal ? 1 : (child.status ?? 1);

if (code === 0) {
  rmSync(appRoot, { recursive: true, force: true });
  rmSync(workdir, { recursive: true, force: true });
} else {
  console.error(`Kept for inspection — app root: ${appRoot}, workspace: ${workdir}`);
}
process.exit(code);
