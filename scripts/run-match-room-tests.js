#!/usr/bin/env node

const { rmSync, mkdirSync, writeFileSync } = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = process.cwd()
const outDir = path.join(root, ".tmp-match-room-tests")

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const tscBin = process.execPath
const tscScript = path.join(root, "node_modules", "typescript", "bin", "tsc")
const tsconfigPath = path.join(outDir, "tsconfig.json")

writeFileSync(
  tsconfigPath,
  JSON.stringify(
    {
      compilerOptions: {
        outDir,
        module: "commonjs",
        target: "es2022",
        moduleResolution: "node",
        esModuleInterop: true,
        skipLibCheck: true,
        baseUrl: root,
        paths: {
          "@/*": ["*"],
        },
      },
      files: [
        "app/api/football/service.ts",
        "lib/server/community-match-room.ts",
        "lib/match-hub-ui.ts",
        "lib/match-preview-lounges.ts",
        "lib/match-timeline-ui.ts",
        "tests/match-room.test.ts",
      ].map((file) =>
        path.join(root, file),
      ),
    },
    null,
    2,
  ),
)

const compile = spawnSync(
  tscBin,
  [tscScript, "--project", tsconfigPath],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  },
)

if (compile.status !== 0) {
  rmSync(outDir, { recursive: true, force: true })
  process.exit(compile.status || 1)
}

const run = spawnSync("node", ["--test", path.join(outDir, "tests", "match-room.test.js")], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
})

rmSync(outDir, { recursive: true, force: true })

process.exit(run.status || 0)
