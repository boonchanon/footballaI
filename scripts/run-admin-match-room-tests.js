#!/usr/bin/env node

const { rmSync, mkdirSync, writeFileSync } = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = process.cwd()
const outDir = path.join(root, ".tmp-admin-match-room-tests")

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
        "lib/admin-access.ts",
        "lib/match-demo-override.ts",
        "lib/match-preview-lounges.ts",
        "lib/server/community-room-conversation.ts",
        "lib/server/admin-community-match-rooms.ts",
        "tests/admin-match-rooms.test.ts",
      ].map((file) => path.join(root, file)),
    },
    null,
    2,
  ),
)

const compile = spawnSync(tscBin, [tscScript, "--project", tsconfigPath], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
})

if (compile.status !== 0) {
  rmSync(outDir, { recursive: true, force: true })
  process.exit(compile.status || 1)
}

// tsc keeps "@/..." specifiers in the emitted JS, so map them onto the compiled output at runtime.
const aliasHookPath = path.join(outDir, "alias-hook.js")
writeFileSync(
  aliasHookPath,
  `const Module = require("node:module")
const path = require("node:path")
const resolve = Module._resolveFilename
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith("@/")) request = path.join(${JSON.stringify(outDir)}, request.slice(2))
  return resolve.call(this, request, ...rest)
}
`,
)

const run = spawnSync("node", ["--require", aliasHookPath, "--test", path.join(outDir, "tests", "admin-match-rooms.test.js")], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
})

rmSync(outDir, { recursive: true, force: true })

process.exit(run.status || 0)
