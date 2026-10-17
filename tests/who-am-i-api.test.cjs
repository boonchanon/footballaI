const test = require("node:test")
const assert = require("node:assert/strict")
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const { randomUUID } = require("node:crypto")

test("Who Am I shares authoritative sessions, history and leaderboard with Quiz", {
  skip: !process.env.QUIZ_TEST_BASE_URL || !process.env.QUIZ_TEST_MONGO_URI || !process.env.QUIZ_TEST_JWT_SECRET,
}, async t => {
  const db = await mongoose.createConnection(process.env.QUIZ_TEST_MONGO_URI).asPromise()
  const users = db.collection("users"), sessions = db.collection("quizsessions")
  const user = new mongoose.Types.ObjectId(), other = new mongoose.Types.ObjectId()
  const name = "Who test " + randomUUID()
  const token = jwt.sign({ sub: String(user) }, process.env.QUIZ_TEST_JWT_SECRET)
  const otherToken = jwt.sign({ sub: String(other) }, process.env.QUIZ_TEST_JWT_SECRET)
  async function request(path, body, auth = token) {
    const response = await fetch(process.env.QUIZ_TEST_BASE_URL + "/api/games/" + path, {
      method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(auth ? { Authorization: "Bearer " + auth } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, data: await response.json() }
  }
  const who = (body, auth) => request("who-am-i", body, auth)
  let state, quiz
  try {
    await users.insertMany([user,other].map(_id => ({ _id, name: _id === user ? name : "Other", email: randomUUID() + "@example.test", password: "test-only" })))
    await t.test("auth, difficulty, idempotent start and hidden answers/hints", async () => {
      assert.equal((await who(null, "")).status,401)
      assert.equal((await who({action:"start",difficulty:"impossible",requestId:randomUUID()})).status,400)
      const body = {action:"start",difficulty:"hard",requestId:randomUUID()}
      const responses = await Promise.all([who(body),who(body),who(body)])
      for (const r of responses) assert.equal(r.status,200)
      state=responses[0].data
      assert.ok(responses.every(r=>r.data.id===state.id))
      assert.equal(await sessions.countDocuments({user}),1)
      assert.equal(state.totalQuestions,6)
      const doc = await sessions.findOne({_id:new mongoose.Types.ObjectId(state.id)})
      assert.equal(doc.bankVersion,2)
      assert.equal(new Set(doc.questions.map(q=>q.answer)).size,6)
      for(const mode of ["clues","career","stats"]) assert.equal(doc.questions.filter(q=>(q.mode||"clues")===mode).length,2)
      assert.ok(["clues","career","stats"].includes(state.currentQuestion.mode))
      assert.match(state.currentQuestion.id,/^\d+$/)
      assert.deepEqual(state.currentQuestion.clueLabels.slice(1),[null,null,null,null,null])
      assert.equal("sources" in state.currentQuestion,false)
      assert.equal("answer" in state.currentQuestion,false)
      assert.equal("questions" in state,false)
      assert.deepEqual(state.currentQuestion.clues.slice(1),[null,null,null,null,null])
      assert.equal((await request("quiz?session="+state.id)).status,404)
      assert.equal((await request("who-am-i?session="+state.id,null,otherToken)).status,404)
      assert.equal((await who({action:"start",difficulty:"easy",requestId:body.requestId})).status,409)
    })
    await t.test("hints and answers commit once; clients cannot set points, hints, difficulty or time", async () => {
      const hint={action:"hint",sessionId:state.id,questionId:state.currentQuestion.id,hintNumber:2}
      const responses=await Promise.all([who(hint),who(hint),who(hint)])
      for(const r of responses) { assert.equal(r.status,200); assert.equal(r.data.revealedClues,2) }
      state=responses[0].data
      assert.equal(state.availablePoints,35)
      for(const extra of [{score:999999},{correctCount:6},{difficulty:"easy"},{timeLeft:99999},{revealedClues:1},{multiplier:100}]) {
        assert.equal((await who({...hint,...extra})).status,400)
      }
      assert.equal((await who({action:"complete",sessionId:state.id})).status,409)
      const doc=await sessions.findOne({_id:new mongoose.Types.ObjectId(state.id)})
      const answer={action:"answer",sessionId:state.id,questionId:state.currentQuestion.id,selected:doc.questions[0].answer}
      const answers=await Promise.all([who(answer),who(answer),who(answer)])
      for(const r of answers) { assert.equal(r.status,200);assert.equal(r.data.score,35);assert.equal(r.data.answers.length,1) }
      state=answers[0].data
      const next={action:"next",sessionId:state.id,questionId:state.currentQuestion.id}
      const deadline=state.deadline
      state=(await who(next)).data
      assert.equal((await who(next)).data.currentIndex,1)
      assert.equal(state.deadline,deadline)
      assert.equal(state.revealedClues,1)
    })
    await t.test("six questions persist once; refresh and duplicate completion preserve score", async () => {
      while(state.status!=="completed") {
        const doc=await sessions.findOne({_id:new mongoose.Types.ObjectId(state.id)})
        state=(await who({action:"answer",sessionId:state.id,questionId:state.currentQuestion.id,selected:doc.questions[state.currentIndex].answer})).data
        if(state.status!=="completed")state=(await who({action:"next",sessionId:state.id,questionId:state.currentQuestion.id})).data
      }
      assert.equal(state.score,235)
      assert.equal(state.correctCount,6)
      const completions=await Promise.all(Array.from({length:5},()=>who({action:"complete",sessionId:state.id})))
      for(const r of completions) {assert.equal(r.data.score,235);assert.equal(r.data.completedAt,state.completedAt)}
      assert.equal((await request("who-am-i?session="+state.id)).data.score,235)
      assert.equal(await sessions.countDocuments({user,status:"completed"}),1)
    })
    await t.test("a real Quiz plus Who Am I appear in the same history and accumulated ranking", async () => {
      quiz=(await request("quiz",{action:"start",category:"clubs-stadiums",requestId:randomUUID()})).data
      assert.equal((await request("who-am-i?session="+quiz.id)).status,404)
      assert.equal((await request("quiz")).data.id,quiz.id)
      while(quiz.status!=="completed") {
        const doc=await sessions.findOne({_id:new mongoose.Types.ObjectId(quiz.id)})
        quiz=(await request("quiz",{action:"answer",sessionId:quiz.id,questionId:quiz.currentQuestion.id,selected:doc.questions[quiz.currentIndex].answer})).data
        if(quiz.status!=="completed")quiz=(await request("quiz",{action:"next",sessionId:quiz.id,questionId:quiz.currentQuestion.id})).data
      }
      const history=(await request("quiz/history")).data
      assert.equal(history.total,2)
      assert.deepEqual(new Set(history.results.map(r=>r.gameType)),new Set(["football-quiz","who-am-i"]))
      const rank=(await request("quiz/leaderboard?period=weekly")).data.players.find(p=>p.name===name)
      assert.equal(rank.points,235+quiz.score)
      assert.equal(rank.games,2)
      assert.equal((await request("quiz/history",null,otherToken)).data.total,0)
    })
    await t.test("expired rounds persist earned points on load and cannot be revived", async () => {
      let expired=(await who({action:"start",difficulty:"hard",requestId:randomUUID()})).data
      const doc=await sessions.findOne({_id:new mongoose.Types.ObjectId(expired.id)})
      expired=(await who({action:"answer",sessionId:expired.id,questionId:expired.currentQuestion.id,selected:doc.questions[0].answer})).data
      await sessions.updateOne({_id:doc._id},{$set:{questionStartedAt:Date.now()-181000}})
      expired=(await request("who-am-i?session="+expired.id)).data
      assert.equal(expired.status,"completed")
      assert.equal(expired.timedOut,true)
      assert.equal(expired.score,40)
      assert.equal(expired.answers.length,1)
      assert.equal((await who({action:"expire",sessionId:expired.id})).data.score,40)
    })
  } finally {
    await sessions.deleteMany({user:{$in:[user,other]}})
    await users.deleteMany({_id:{$in:[user,other]}})
    await db.close()
  }
})
