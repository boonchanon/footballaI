const test = require("node:test")
const assert = require("node:assert/strict")
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const { randomUUID } = require("node:crypto")

test("real Quiz history and leaderboard", {
  skip: !process.env.QUIZ_TEST_BASE_URL || !process.env.QUIZ_TEST_MONGO_URI || !process.env.QUIZ_TEST_JWT_SECRET,
}, async t => {
  const db = await mongoose.createConnection(process.env.QUIZ_TEST_MONGO_URI).asPromise()
  const users = db.collection("users"), sessions = db.collection("quizsessions")
  const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()]
  const names = ids.map((id, i) => `Results test ${i} ${id}`)
  const tokens = ids.map(id => jwt.sign({ sub: String(id) }, process.env.QUIZ_TEST_JWT_SECRET))
  const fixtures = []
  async function request(path, token, body) {
    const response = await fetch(process.env.QUIZ_TEST_BASE_URL + "/api/games/quiz" + path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, data: await response.json() }
  }
  async function complete(index) {
    let response = await request("", tokens[index], { action: "start", category: "clubs-stadiums", requestId: randomUUID() })
    assert.equal(response.status, 200)
    let state = response.data
    const doc = await sessions.findOne({ _id: new mongoose.Types.ObjectId(state.id) })
    while (state.status !== "completed") {
      response = await request("", tokens[index], { action: "answer", sessionId: state.id, questionId: state.currentQuestion.id, selected: doc.questions[state.currentIndex].answer })
      assert.equal(response.status, 200)
      state = response.data
      if (state.status !== "completed") state = (await request("", tokens[index], { action: "next", sessionId: state.id, questionId: state.currentQuestion.id })).data
    }
    return sessions.findOne({ _id: doc._id })
  }
  try {
    await users.insertMany(ids.map((_id, i) => ({ _id, name: names[i], avatar: "", email: randomUUID() + "@example.test", password: "test-only" })))
    await t.test("empty states and authentication", async () => {
      assert.equal((await request("/history")).status, 401)
      assert.deepEqual((await request("/history", tokens[0])).data.results, [])
      assert.deepEqual((await request("/leaderboard?period=weekly")).data.players, [])
      assert.equal((await request("/leaderboard?period=invalid")).status, 400)
      assert.equal((await request("/history?page=-1", tokens[0])).status, 400)
    })
    await t.test("both players finish real games; history is private and survives reload", async () => {
      fixtures.push(await complete(0), await complete(1))
      for (let i = 0; i < 2; i++) {
        const history = (await request("/history", tokens[i])).data
        assert.equal(history.total, 1)
        assert.equal(history.results[0].id, String(fixtures[i]._id))
        assert.equal(history.results[0].score, fixtures[i].score)
        assert.deepEqual((await request("/history", tokens[i])).data, history)
        assert.deepEqual(Object.keys(history.results[0]).sort(), ["category", "completedAt", "correctCount", "difficulty", "gameType", "id", "score", "totalQuestions"].sort())
        assert.equal(history.results[0].difficulty, "medium")
      }
    })
    await t.test("database period filtering matches exact boundaries and ignores incomplete results", async () => {
      for (const period of ["weekly", "monthly", "season"]) {
        const bounds = (await request("/leaderboard?period=" + period)).data
        const start = new Date(bounds.start), end = new Date(bounds.end)
        for (const [index, date] of [new Date(start.getTime() - 1), start, new Date(end.getTime() - 1), end].entries()) {
          const fixture = { ...fixtures[index % 2], _id: new mongoose.Types.ObjectId(), requestId: randomUUID(), completedAt: date }
          await sessions.insertOne(fixture)
        }
      }
      await sessions.insertOne({ ...fixtures[0], _id: new mongoose.Types.ObjectId(), requestId: randomUUID(), status: "playing", score: 999999 })
      for (const period of ["weekly", "monthly", "season"]) {
        const result = (await request("/leaderboard?period=" + period)).data
        const records = await sessions.find({ user: { $in: ids }, status: "completed", completedAt: { $gte: new Date(result.start), $lt: new Date(result.end), $lte: new Date() } }).toArray()
        for (let i = 0; i < 2; i++) {
          const own = records.filter(row => row.user.equals(ids[i]))
          const row = result.players.find(player => player.name === names[i])
          if (!own.length) assert.equal(row, undefined)
          else { assert.equal(row.points, own.reduce((sum, game) => sum + game.score, 0)); assert.equal(row.games, own.length) }
        }
        for (const player of result.players) assert.deepEqual(Object.keys(player).sort(), ["avatar", "games", "name", "points", "rank"].sort())
        assert.ok(result.players.every(player => !["SomchaiGoal99", "BallKingTH", "FootballNerd"].includes(player.name)))
      }
    })
    await t.test("history pagination is newest first and excludes unfinished rounds", async () => {
      for (let i = 0; i < 12; i++) await sessions.insertOne({ ...fixtures[0], _id: new mongoose.Types.ObjectId(), requestId: randomUUID(), completedAt: new Date(Date.now() - i * 1000) })
      const first = (await request("/history", tokens[0])).data
      const second = (await request("/history?page=2", tokens[0])).data
      assert.equal(first.results.length, 10)
      assert.ok(second.results.length > 0)
      assert.ok(first.results.every(row => !second.results.some(other => row.id === other.id)))
      const dates = [...first.results, ...second.results].map(row => new Date(row.completedAt).getTime())
      assert.deepEqual(dates, [...dates].sort((a, b) => b - a))
      assert.ok(first.results.every(row => row.score !== 999999))
    })
    await t.test("tied scores have deterministic ranks without private IDs", async () => {
      await sessions.deleteMany({ user: { $in: ids } })
      const date = new Date(Date.now() - 1000)
      await sessions.insertMany(ids.map((user, i) => ({ ...fixtures[i], user, score: 150, completedAt: date })))
      const first = (await request("/leaderboard?period=weekly")).data
      const second = (await request("/leaderboard?period=weekly")).data
      assert.deepEqual(first.players, second.players)
      const own = first.players.filter(player => names.includes(player.name))
      assert.equal(own.length, 2)
      assert.deepEqual(own.map(player => player.name), ids.map((id, i) => ({ id: String(id), name: names[i] })).sort((a,b) => a.id.localeCompare(b.id)).map(row => row.name))
    })
  } finally {
    await sessions.deleteMany({ user: { $in: ids } })
    await users.deleteMany({ _id: { $in: ids } })
    await db.close()
  }
})
