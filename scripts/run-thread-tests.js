#!/usr/bin/env node

const { rmSync, mkdirSync } = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = process.cwd()
const outDir = path.join(root, ".tmp-thread-tests")

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const tscBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc")

const compile = spawnSync(
  tscBin,
  [
    "--outDir",
    outDir,
    "--module",
    "commonjs",
    "--target",
    "es2022",
    "--moduleResolution",
    "node",
    "--esModuleInterop",
    "--skipLibCheck",
    "lib/server/community-threads.ts",
    "tests/threads.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env },
)

if (compile.status !== 0) {
  rmSync(outDir, { recursive: true, force: true })
  process.exit(compile.status || 1)
}

const run = spawnSync("node", ["--test", path.join(outDir, "tests", "threads.test.js")], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
})

rmSync(outDir, { recursive: true, force: true })

process.exit(run.status || 0)
