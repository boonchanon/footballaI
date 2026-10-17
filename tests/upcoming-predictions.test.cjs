const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const ts = require("typescript")
const Module = require("node:module")
const path = require("node:path")
const filename = path.join(__dirname, "../lib/games/upcoming-predictions.ts")
const compiled = new Module(filename, module)
compiled._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, filename)
const { getUpcomingPredictions, getBangkokWeek, getWeeklyPredictions } = compiled.exports
const now = Date.parse("2026-09-29T12:00:00Z")
const fixture = (id, date = "2026-09-29T18:30:00Z", status = {}) => ({
  id, date, homeTeam: "Home", awayTeam: "Away", homeTeamThai: "เจ้าบ้าน", awayTeamThai: "ทีมเยือน",
  homeLogo: "https://example.test/home.png", awayLogo: "https://example.test/away.png",
  status: { isUpcoming: true, isLive: false, isFinished: false, short: "NS", ...status },
})

test("uses actual IDs, names and logos and formats kickoff in Bangkok time", () => {
  const [match] = getUpcomingPredictions([fixture(98765)], now)
  assert.equal(match.id, "98765")
  assert.equal(match.home, "เจ้าบ้าน")
  assert.equal(match.away, "ทีมเยือน")
  assert.equal(match.homeLogo, "https://example.test/home.png")
  assert.equal(match.time, "01:30")
  assert.match(match.date, /30/)
})
test("excludes past, live, finished, postponed, cancelled and unknown kickoff fixtures", () => {
  const invalid = [fixture(1, new Date(now).toISOString()), fixture(2,"invalid"),fixture(3,undefined,{isLive:true}),
    fixture(4,undefined,{isFinished:true}),fixture(5,undefined,{short:"PST"}),fixture(6,undefined,{long:"Cancelled"}),
    fixture(7,undefined,{short:"TBD"}),fixture(8,undefined,{isUpcoming:false})]
  assert.deepEqual(getUpcomingPredictions(invalid,now),[])
})
test("sorts chronologically, deduplicates IDs and returns only the nearest three", () => {
  const rows = [fixture(4,"2026-10-04T12:00:00Z"),fixture(2,"2026-10-02T12:00:00Z"),fixture(1,"2026-10-01T12:00:00Z"),fixture(3,"2026-10-03T12:00:00Z"),fixture(1,"2026-10-01T12:00:00Z")]
  assert.deepEqual(getUpcomingPredictions(rows,now).map(row=>row.id),["1","2","3"])
  assert.deepEqual(getUpcomingPredictions([],now),[])
})
test("closes the card when kickoff passes even without another API response", () => {
  const row=fixture("real-match")
  assert.equal(getUpcomingPredictions([row],Date.parse(row.date)-1).length,1)
  assert.equal(getUpcomingPredictions([row],Date.parse(row.date)).length,0)
})

test("Bangkok weeks start on Monday and cross year boundaries correctly", () => {
  const sunday = getBangkokWeek(Date.parse("2026-01-04T16:59:59Z"))
  assert.equal(new Date(sunday.start).toISOString(), "2025-12-28T17:00:00.000Z")
  assert.equal(new Date(sunday.end).toISOString(), "2026-01-04T17:00:00.000Z")
  const monday = getBangkokWeek(Date.parse("2026-01-04T17:00:00Z"))
  assert.equal(monday.start, sunday.end)
  assert.equal(getBangkokWeek(Date.parse("2026-01-04T17:00:00Z"), -1).start, sunday.start)
  assert.equal(getBangkokWeek(Date.parse("2026-01-04T17:00:00Z"), 1).start, monday.end)
})

test("weekly view shows every fixture, including closed matches, without the three-card cap", () => {
  const week = getBangkokWeek(now)
  const rows = Array.from({ length: 12 }, (_, id) => fixture(id + 1, new Date(week.start + id * 3600000).toISOString()))
  rows.push(fixture(30, new Date(week.start - 1).toISOString()), fixture(31, new Date(week.end).toISOString()))
  rows.push(rows[0], fixture(32, "invalid"))
  const result = getWeeklyPredictions(rows, week.start - 1, week)
  assert.equal(result.length, 12)
  assert.equal(result.every(match => match.openForPrediction), true)
  assert.equal(getWeeklyPredictions(rows, week.end, week).filter(match => match.openForPrediction).length, 0)
  assert.equal(getUpcomingPredictions(rows, week.start - 1).length, 3)
})

test("weekly view keeps live, finished and postponed fixtures visible but closed", () => {
  const week = getBangkokWeek(now)
  const rows = [fixture(1, undefined, { isLive: true }), fixture(2, undefined, { isFinished: true }), fixture(3, undefined, { short: "PST" }), fixture(4)]
  const result = getWeeklyPredictions(rows, now, week)
  assert.equal(result.length, 4)
  assert.deepEqual(result.map(match => match.openForPrediction), [false, false, false, true])
  assert.equal(result[0].statusLabel, "กำลังแข่งขัน")
  assert.equal(result[1].statusLabel, "จบการแข่งขัน")
})
