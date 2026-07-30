#!/usr/bin/env node

const path = require("node:path")
const { mkdtempSync, rmSync, mkdirSync, existsSync } = require("node:fs")
const { spawnSync } = require("node:child_process")

function compileTypeScriptFiles(files) {
  const root = process.cwd()
  const tempRoot = path.join(root, ".tmp-runtime")
  mkdirSync(tempRoot, { recursive: true })
  const outDir = mkdtempSync(path.join(tempRoot, "footballai-moderation-"))
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
      ...files,
    ],
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

  return {
    outDir,
    cleanup() {
      rmSync(outDir, { recursive: true, force: true })
    },
  }
}

function loadCompiledModule(compilation, modulePath) {
  const candidates = [
    path.join(compilation.outDir, modulePath),
    path.join(compilation.outDir, path.basename(modulePath)),
  ]
  const resolved = candidates.find((candidate) => existsSync(candidate))
  if (!resolved) {
    throw new Error(`Cannot find compiled module for ${modulePath}`)
  }
  return require(resolved)
}

module.exports = {
  compileTypeScriptFiles,
  loadCompiledModule,
}
