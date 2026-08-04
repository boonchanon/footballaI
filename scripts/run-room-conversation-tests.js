#!/usr/bin/env node

const { rmSync, mkdirSync, writeFileSync } = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = process.cwd()
const outDir = path.join(root, ".tmp-room-conversation-tests")

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const tscBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc")
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
        "lib/match-demo-override.ts",
        "lib/match-main-room-ui.ts",
        "lib/match-tactical-room-ui.ts",
        "lib/match-preview-lounges.ts",
        "lib/match-timeline-ui.ts",
        "lib/server/community-match-room.ts",
        "lib/server/community-room-conversation.ts",
        "lib/server/community-threads.ts",
        "tests/room-conversation.test.ts",
      ].map((file) => path.join(root, file)),
    },
    null,
    2,
  ),
)

const compile = spawnSync(tscBin, ["--project", tsconfigPath], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
})

if (compile.status !== 0) {
  rmSync(outDir, { recursive: true, force: true })
  process.exit(compile.status || 1)
}

const run = spawnSync("node", ["--test", path.join(outDir, "tests", "room-conversation.test.js")], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
})

rmSync(outDir, { recursive: true, force: true })

process.exit(run.status || 0)
