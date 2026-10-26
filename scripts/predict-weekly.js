#!/usr/bin/env node
// Runs the weekly AI prediction refresh (ml/src/models/weekly_refresh.py --publish) with the
// Python from ml/.venv, forwarding CLI args (e.g. --api-url, --as-of). The website must be running
// because the fixtures and results come from its /api/football/fixtures endpoint.
const path = require("node:path")
const { existsSync } = require("node:fs")
const { spawnSync } = require("node:child_process")

const mlRoot = path.join(__dirname, "..", "ml")
const python =
  process.platform === "win32" ? path.join(mlRoot, ".venv", "Scripts", "python.exe") : path.join(mlRoot, ".venv", "bin", "python")

if (!existsSync(python)) {
  console.error(`Python not found at ${python}. Create it first: py -3.11 -m venv ml/.venv && ml/.venv/Scripts/python -m pip install -r ml/requirements.txt`)
  process.exit(1)
}

const run = spawnSync(python, ["-m", "src.models.weekly_refresh", "--publish", ...process.argv.slice(2)], {
  cwd: mlRoot,
  stdio: "inherit",
  env: process.env,
})
process.exit(run.status ?? 1)
