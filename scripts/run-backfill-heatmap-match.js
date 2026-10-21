#!/usr/bin/env node
// Compiles scripts/backfill-heatmap-match.ts with tsc and runs it, forwarding CLI args (e.g. --dry-run).
const path = require("node:path")
const { mkdirSync, mkdtempSync, rmSync } = require("node:fs")
const { spawnSync } = require("node:child_process")

const root = process.cwd()
const tempRoot = path.join(root, ".tmp-runtime")
mkdirSync(tempRoot, { recursive: true })
const outDir = mkdtempSync(path.join(tempRoot, "backfill-heatmap-match-"))
const tscScript = path.join(root, "node_modules", "typescript", "bin", "tsc")

const compile = spawnSync(
  process.execPath,
  [tscScript, "--outDir", outDir, "--module", "commonjs", "--target", "es2022", "--moduleResolution", "node", "--esModuleInterop", "--skipLibCheck", "--strict", path.join(root, "scripts", "backfill-heatmap-match.ts")],
  { cwd: root, stdio: "inherit" },
)
const run =
  compile.status === 0 &&
  spawnSync(process.execPath, [path.join(outDir, "backfill-heatmap-match.js"), ...process.argv.slice(2)], { cwd: root, stdio: "inherit", env: process.env })
rmSync(outDir, { recursive: true, force: true })
process.exit(compile.status !== 0 ? compile.status ?? 1 : run.status ?? 1)
