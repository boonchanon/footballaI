const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const ts = require("typescript")
const Module = require("node:module")
const path = require("node:path")
const filename = path.join(__dirname, "../lib/games/first-scorer.ts")
const compiled = new Module(filename, module)
compiled._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, filename)
const { getScorerPlayers, canSelectScorer } = compiled.exports

test("uses provider identity, name, position and photo without fabricated players", () => {
  assert.deepEqual(getScorerPlayers([{ id: 12, name: "Player", position: "Forward", photo: "https://example.test/p.png" }], "8", "Team"), [
    { id: "8:12", name: "Player", team: "Team", position: "Forward", img: "https://example.test/p.png" },
  ])
  assert.deepEqual(getScorerPlayers([], "8", "Team"), [])
})
test("rejects missing identifiers, names and duplicate players", () => {
  const rows = [{ id: 0, name: "Invalid" }, { id: "", name: "Invalid" }, { id: 1, name: " " }, { id: 2, name: "Real" }, { id: 2, name: "Real" }]
  assert.equal(getScorerPlayers(rows, "8", "Team").length, 1)
  assert.deepEqual(getScorerPlayers(rows, "", "Team"), [])
})
test("prevents unknown players, unavailable squads and selections at or after kickoff", () => {
  const match = { kickoffAt: 100, playersReady: true, players: getScorerPlayers([{ id: 12, name: "Player" }], "8", "Team") }
  assert.equal(canSelectScorer(match, "8:12", 99), true)
  assert.equal(canSelectScorer(match, "8:12", 100), false)
  assert.equal(canSelectScorer(match, "other", 99), false)
  assert.equal(canSelectScorer({ ...match, playersReady: false }, "8:12", 99), false)
})
