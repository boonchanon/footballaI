const test = require("node:test")
const assert = require("node:assert/strict")
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const { randomUUID } = require("node:crypto")

test("authenticated Quiz API persists secure, idempotent results", {
  skip: !process.env.QUIZ_TEST_BASE_URL || !process.env.QUIZ_TEST_MONGO_URI || !process.env.QUIZ_TEST_JWT_SECRET,
}, async t => {
  const db = await mongoose.createConnection(process.env.QUIZ_TEST_MONGO_URI).asPromise()
  const users = db.collection("users")
  const sessions = db.collection("quizsessions")
  const user = new mongoose.Types.ObjectId()
  const other = new mongoose.Types.ObjectId()
  const token = jwt.sign({ sub: String(user) }, process.env.QUIZ_TEST_JWT_SECRET)
  const otherToken = jwt.sign({ sub: String(other) }, process.env.QUIZ_TEST_JWT_SECRET)
  await users.insertMany([user,other].map(_id => ({ _id, name: "Quiz test", email: randomUUID() + "@example.test", password: "isolated-test-only" })))
  async function api(body, auth = token, query = "") {
    const response = await fetch(process.env.QUIZ_TEST_BASE_URL + "/api/games/quiz" + query, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(auth ? { Authorization: "Bearer " + auth } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, data: await response.json() }
  }
  let state
  try {
    await t.test("requires real authentication and validates categories", async () => {
      assert.equal((await api(null, "")).status, 401)
      assert.equal((await api({ action: "start", category: "invalid", requestId: randomUUID() })).status, 400)
      assert.equal((await api({ action: "start", category: "mixed", difficulty: "impossible", requestId: randomUUID() })).status, 400)
    })
    await t.test("concurrent start retries create one session and do not expose keys", async () => {
      const body = { action: "start", category: "clubs-stadiums", requestId: randomUUID() }
      const results = await Promise.all([api(body),api(body),api(body)])
      for (const result of results) assert.equal(result.status, 200)
      state = results[0].data
      assert.ok(results.every(result => result.data.id === state.id))
      assert.equal(await sessions.countDocuments({ user }), 1)
      assert.equal("answer" in state.currentQuestion, false)
      assert.equal("questions" in state, false)
    })
    await t.test("ownership, score injection, early finish, and invalid answer protection", async () => {
      assert.equal((await api(null, otherToken, "?session=" + state.id)).status, 404)
      assert.equal((await api({ action: "complete", sessionId: state.id }, otherToken)).status, 404)
      assert.equal((await api({ action: "complete", sessionId: state.id })).status, 409)
      assert.equal((await api({ action: "answer", sessionId: state.id, questionId: state.currentQuestion.id, selected: 0, score: 999999 })).status, 400)
      assert.equal((await api({ action: "answer", sessionId: state.id, questionId: state.currentQuestion.id, selected: 99 })).status, 400)
    })
    await t.test("expired answer receives no points even when its answer is correct", async () => {
      const doc = await sessions.findOne({ _id: new mongoose.Types.ObjectId(state.id) })
      await sessions.updateOne({ _id: doc._id }, { $set: { questionStartedAt: Date.now() - 20000 } })
      const body = { action: "answer", sessionId: state.id, questionId: state.currentQuestion.id, selected: doc.questions[0].answer }
      const results = await Promise.all([api(body), api(body), api(body)])
      state = results[0].data
      assert.equal(state.score, 0)
      assert.equal(state.answers.length, 1)
      assert.equal(state.answers[0].selected, null)
      const next = { action: "next", sessionId: state.id, questionId: state.currentQuestion.id }
      state = (await api(next)).data
      const deadline = state.deadline
      assert.equal((await api(next)).data.deadline, deadline)
    })
    await t.test("answers every remaining question and persists one completed result", async () => {
      while (state.status !== "completed") {
        const doc = await sessions.findOne({ _id: new mongoose.Types.ObjectId(state.id) })
        const body = { action: "answer", sessionId: state.id, questionId: state.currentQuestion.id, selected: doc.questions[state.currentIndex].answer }
        const response = await api(body)
        assert.equal(response.status, 200)
        state = response.data
        assert.equal((await api(body)).data.score, state.score)
        if (state.status !== "completed") state = (await api({ action: "next", sessionId: state.id, questionId: state.currentQuestion.id })).data
      }
      assert.equal(state.answers.length, 6)
      assert.equal(state.correctCount, 5)
      assert.ok(state.score >= 55 && state.score <= 75)
      const doc = await sessions.findOne({ _id: new mongoose.Types.ObjectId(state.id) })
      assert.equal(doc.score, state.score)
      assert.equal(doc.user.toString(), user.toString())
      assert.equal(doc.gameType, "football-quiz")
      assert.ok(doc.completedAt && doc.createdAt && doc.updatedAt)
    })
    await t.test("refresh and repeated completion retain exactly one result", async () => {
      const results = await Promise.all(Array.from({length:5}, () => api({ action: "complete", sessionId: state.id })))
      for (const result of results) {
        assert.equal(result.status, 200)
        assert.equal(result.data.score, state.score)
        assert.equal(result.data.completedAt, state.completedAt)
      }
      assert.equal((await api(null, token, "?session=" + state.id)).data.score, state.score)
      assert.equal((await api(null)).data.id, state.id)
      assert.equal(await sessions.countDocuments({user, status:"completed"}), 1)
      assert.equal((await api({ action: "complete", sessionId: state.id, score: 1000000 })).status, 400)
    })
    await t.test("new rounds avoid the previous set and persist validated difficulty", async () => {
      const previous = await sessions.findOne({ _id: new mongoose.Types.ObjectId(state.id) })
      const body = { action: "start", category: "clubs-stadiums", difficulty: "easy", requestId: randomUUID() }
      const result = await api(body)
      assert.equal(result.status, 200)
      assert.equal(result.data.difficulty, "easy")
      assert.equal(result.data.secondsPerQuestion, 30)
      const doc = await sessions.findOne({ _id: new mongoose.Types.ObjectId(result.data.id) })
      assert.equal(doc.questions.length, 6)
      assert(doc.questions.every(q => !previous.questions.some(old => old.id === q.id)))
      assert.equal((await api({ ...body, difficulty: "hard" })).status, 409)
      assert.equal((await api(null, token, "?session=" + result.data.id)).data.deadline, result.data.deadline)
      assert.equal((await api({ action: "answer", sessionId: result.data.id, questionId: result.data.currentQuestion.id, selected: 0, difficulty: "easy" })).status, 400)
      for (const category of ["mixed", "football-rules", "football-data"]) {
        const next = await api({ action: "start", category, difficulty: "hard", requestId: randomUUID() })
        assert.equal(next.status, 200)
        assert.equal(next.data.secondsPerQuestion, 15)
        assert.equal(next.data.totalQuestions, 6)
        assert.equal("answer" in next.data.currentQuestion, false)
      }
    })
  } finally {
    await sessions.deleteMany({user: {$in:[user,other]}})
    await users.deleteMany({_id: {$in:[user,other]}})
    await db.close()
  }
})
